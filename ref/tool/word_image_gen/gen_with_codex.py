from __future__ import annotations

import hashlib
import json
import os
import queue
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Sequence

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    Image = None
    UnidentifiedImageError = OSError


PROJECT_DIR = Path(__file__).resolve().parent
WORDS_PATH = PROJECT_DIR / "words.txt"
SCENE_HINTS_PATH = PROJECT_DIR / "scene_hints.json"
OUTPUT_DIR = PROJECT_DIR / "new"
LOG_DIR = PROJECT_DIR / "logs"

TIMEOUT_SECONDS = 20 * 60
RETRIES = 2

# A compact, varied reference set keeps every image request consistent without
# attaching the entire ref directory.
REFERENCE_PATHS = (
    PROJECT_DIR / "ref" / "abandon.png",
    PROJECT_DIR / "ref" / "able.png",
    PROJECT_DIR / "ref" / "operations.png",
)

WORD_PATTERN = re.compile(r"^[A-Za-z][A-Za-z'-]*$")
WINDOWS_RESERVED_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{number}" for number in range(1, 10)),
    *(f"LPT{number}" for number in range(1, 10)),
}


@dataclass(frozen=True)
class PngValidation:
    ok: bool
    message: str
    width: int = 0
    height: int = 0


@dataclass(frozen=True)
class WordResult:
    word: str
    status: str
    message: str


def resolve_codex_executable() -> Path | None:
    """Find Codex even when an IDE does not inherit Codex Desktop's PATH."""
    candidates: list[Path] = []

    override = os.environ.get("CODEX_EXECUTABLE", "").strip().strip('"')
    if override:
        candidates.append(Path(override).expanduser())

    path_match = shutil.which("codex")
    if path_match:
        candidates.append(Path(path_match))

    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        local_root = Path(local_app_data)
        desktop_bin = local_root / "OpenAI" / "Codex" / "bin"
        if desktop_bin.is_dir():
            desktop_executables = sorted(
                desktop_bin.glob("*/codex.exe"),
                key=lambda path: path.stat().st_mtime,
                reverse=True,
            )
            candidates.extend(desktop_executables)
        candidates.extend(
            (
                desktop_bin / "codex.exe",
                local_root / "Programs" / "Codex" / "codex.exe",
                local_root / "Microsoft" / "WinGet" / "Links" / "codex.exe",
            )
        )

    seen: set[str] = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        normalized = os.path.normcase(str(resolved))
        if normalized in seen:
            continue
        seen.add(normalized)
        if resolved.is_file():
            return resolved
    return None


def filename_for_word(word: str) -> str:
    return word.replace("'", "") + ".png"


def read_words() -> list[str]:
    text = WORDS_PATH.read_text(encoding="utf-8-sig")
    words: list[str] = []
    seen: set[str] = set()
    filenames: dict[str, str] = {}

    for line_number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        for raw_word in stripped.split(","):
            word = raw_word.strip().lower()
            if not word:
                continue
            if not WORD_PATTERN.fullmatch(word):
                raise ValueError(
                    f"words.txt line {line_number}: invalid English word {raw_word!r}"
                )
            filename = filename_for_word(word).lower()
            if filename.removesuffix(".png").upper() in WINDOWS_RESERVED_NAMES:
                raise ValueError(
                    f"words.txt line {line_number}: {word!r} cannot be a Windows filename"
                )
            if filename in filenames and filenames[filename] != word:
                raise ValueError(
                    f"words {filenames[filename]!r} and {word!r} map to the same PNG filename"
                )
            filenames[filename] = word
            if word not in seen:
                seen.add(word)
                words.append(word)

    if not words:
        raise ValueError("words.txt does not contain any words")
    return words


def validate_references() -> tuple[Path, ...]:
    missing = [path for path in REFERENCE_PATHS if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "reference image not found: " + ", ".join(str(path) for path in missing)
        )
    return tuple(path.resolve() for path in REFERENCE_PATHS)


def build_base_codex_command(codex_executable: Path, sandbox: str) -> list[str]:
    command = [
        str(codex_executable),
        "exec",
        "--ephemeral",
        "--color",
        "never",
        "--skip-git-repo-check",
        "--cd",
        str(PROJECT_DIR),
    ]
    # --approve-for-me already selects the workspace-write sandbox in current
    # Codex CLI versions, so combining it with --sandbox is a CLI usage error.
    if sandbox == "workspace-write":
        command.append("--approve-for-me")
    else:
        command.extend(("--sandbox", sandbox))
    return command


def stream_codex(
    command: Sequence[str],
    prompt: str,
    label: str,
    log_path: Path,
) -> tuple[int, bool]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("w", encoding="utf-8", newline="\n") as log:
        log.write(
            f"COMMAND\n{shlex.join(command[:-1])} <PROMPT>"
            f"\n\nPROMPT\n{prompt}\n\nOUTPUT\n"
        )
        log.flush()
        try:
            process = subprocess.Popen(
                command,
                cwd=PROJECT_DIR,
                # Pass the complete prompt through a private pipe and close it
                # immediately. This avoids both open IDE stdin pipes and --image's
                # variadic arguments consuming a positional prompt.
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )
        except OSError as error:
            message = f"Could not start Codex: {error}\n"
            print(f"[{label}] {message}", end="", file=sys.stderr)
            log.write(message)
            return 127, False

        assert process.stdout is not None
        lines: queue.Queue[str | None] = queue.Queue()

        def read_output() -> None:
            assert process.stdout is not None
            for output_line in process.stdout:
                lines.put(output_line)
            lines.put(None)

        reader = threading.Thread(target=read_output, daemon=True)
        reader.start()
        assert process.stdin is not None
        try:
            process.stdin.write(prompt)
            process.stdin.close()
        except (BrokenPipeError, OSError):
            # Preserve and report the CLI's actual stderr/stdout and exit code.
            try:
                process.stdin.close()
            except OSError:
                pass
        deadline = time.monotonic() + TIMEOUT_SECONDS
        next_progress_notice = time.monotonic() + 30
        stream_finished = False
        timed_out = False

        while not stream_finished:
            try:
                output_line = lines.get(timeout=0.25)
            except queue.Empty:
                now = time.monotonic()
                if not timed_out and now >= deadline:
                    timed_out = True
                    process.kill()
                    message = f"Timed out after {TIMEOUT_SECONDS / 60:.0f} minutes.\n"
                    print(f"[{label}] {message}", end="", file=sys.stderr)
                    log.write(message)
                    log.flush()
                elif not timed_out and now >= next_progress_notice:
                    message = "AI is still working; no keyboard input is required.\n"
                    print(f"[{label}] {message}", end="")
                    log.write(message)
                    log.flush()
                    next_progress_notice = now + 30
                continue
            if output_line is None:
                stream_finished = True
                continue
            if output_line.strip() in {
                "Reading additional input from stdin...",
                "Reading prompt from stdin...",
            }:
                print(
                    f"[{label}] prompt sent; AI is working "
                    "(no keyboard input is required)."
                )
                log.write(output_line)
                log.flush()
                next_progress_notice = time.monotonic() + 30
                continue
            print(f"[{label}] {output_line}", end="")
            log.write(output_line)
            log.flush()
            next_progress_notice = time.monotonic() + 30

        return_code = process.wait()
        reader.join(timeout=1)
        return return_code, timed_out


def build_scene_schema(words: Sequence[str]) -> dict[str, object]:
    return {
        "type": "object",
        "properties": {
            word: {
                "type": "string",
                "minLength": 30,
                "maxLength": 500,
            }
            for word in words
        },
        "required": list(words),
        "additionalProperties": False,
    }


def build_scene_prompt(words: Sequence[str], previous_failure: str | None = None) -> str:
    retry_note = (
        f"\nThe previous attempt failed validation: {previous_failure}\n"
        if previous_failure
        else ""
    )
    return f"""
Create one image-scene direction for every English word in this JSON array:
{json.dumps(list(words), ensure_ascii=False)}

Return exactly one JSON object. Each key must be one supplied word and each value
must be an English scene direction suitable for a minimalist educational line-art
illustration.

For every value:
- use one concrete, immediately understandable scene rather than an abstract symbol
- describe the people, objects, actions, and spatial relationship needed in the image
- keep the scene cohesive and reasonably simple
- choose the most useful everyday meaning when a word is ambiguous
- avoid relying on written words, letters, numbers, labels, captions, flags, or logos
- avoid stereotypes, caricatures, graphic violence, or demeaning portrayals
- do not give drawing-style instructions; describe only the scene content
- use one or two concise sentences

Do not call image generation. Do not edit any file. Do not run Git. Your final
response must contain only the JSON object that conforms to the supplied schema.
{retry_note}
""".strip()


def validate_scene_payload(payload: object, words: Sequence[str]) -> dict[str, str]:
    if not isinstance(payload, dict):
        raise ValueError("Codex response is not a JSON object")
    expected = set(words)
    actual = set(payload)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise ValueError(f"scene keys differ from words.txt; missing={missing}, extra={extra}")

    validated: dict[str, str] = {}
    for word in words:
        value = payload[word]
        if not isinstance(value, str) or len(value.strip()) < 30:
            raise ValueError(f"scene hint for {word!r} is missing or too short")
        validated[word] = value.strip()
    return validated


def write_scene_hints(scene_hints: dict[str, str]) -> None:
    temporary_path = SCENE_HINTS_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(
        json.dumps(scene_hints, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary_path.replace(SCENE_HINTS_PATH)


def load_scene_hints(words: Sequence[str]) -> dict[str, str]:
    payload = json.loads(SCENE_HINTS_PATH.read_text(encoding="utf-8-sig"))
    return validate_scene_payload(payload, words)


def regenerate_scene_hints(
    words: Sequence[str], run_stamp: str, codex_executable: Path
) -> dict[str, str]:
    previous_failure: str | None = None
    with tempfile.TemporaryDirectory(prefix="word-image-scenes-") as temp_directory:
        temp_dir = Path(temp_directory)
        schema_path = temp_dir / "scene-schema.json"
        response_path = temp_dir / "scene-response.json"
        schema_path.write_text(
            json.dumps(build_scene_schema(words), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        for attempt in range(1, RETRIES + 2):
            prompt = build_scene_prompt(words, previous_failure)
            command = build_base_codex_command(codex_executable, "read-only")
            command.extend(
                (
                    "--output-schema",
                    str(schema_path),
                    "--output-last-message",
                    str(response_path),
                    "--",
                    "-",
                )
            )
            log_path = LOG_DIR / f"{run_stamp}-scene-hints-attempt-{attempt}.log"
            print(f"\n[scene-hints] attempt {attempt}/{RETRIES + 1}")
            return_code, timed_out = stream_codex(
                command, prompt, "scene-hints", log_path
            )
            if timed_out:
                previous_failure = "the Codex process timed out"
                continue
            if return_code != 0:
                previous_failure = f"Codex exited with status {return_code}; see {log_path}"
                if return_code == 2:
                    break
                continue
            try:
                payload = json.loads(response_path.read_text(encoding="utf-8-sig"))
                scene_hints = validate_scene_payload(payload, words)
                write_scene_hints(scene_hints)
                # Image generation must consume the persisted JSON, not an in-memory shortcut.
                return load_scene_hints(words)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                previous_failure = str(error)
                print(
                    f"[scene-hints] validation failed: {previous_failure}",
                    file=sys.stderr,
                )

    raise RuntimeError(
        f"could not regenerate scene_hints.json after {RETRIES + 1} attempts: "
        f"{previous_failure}"
    )


def build_image_prompt(
    word: str,
    scene_hint: str,
    output_path: Path,
    previous_failure: str | None,
) -> str:
    retry_note = (
        "\nA previous attempt failed local validation for this reason: "
        f"{previous_failure}\nReplace only the target PNG and correct that problem."
        if previous_failure
        else ""
    )
    return f"""
Generate exactly one final image asset for the English word {word!r}.

Use the installed imagegen skill and its built-in image-generation tool. This is a
new raster illustration, not an SVG, diagram, contact sheet, or code placeholder.
The attached images are style references only. Do not edit or copy their subjects.

Scene direction loaded from scene_hints.json:
{scene_hint}

Visual contract:
- minimalist educational black line art matching the references
- one centered cohesive scene with generous empty margin
- smooth, confident outlines and a simple readable silhouette
- solid, fully opaque pure white background with no alpha transparency
- black and white pixels only; no color, gray shading, gradients, hatching,
  shadows, textures, or patterned background
- no words, letters, numbers, captions, labels, fake writing, logos, or watermark
- no border, grid, panels, split image, or rendered background pattern

Output contract:
- save the single chosen PNG exactly to: {output_path}
- the output path is authorized; replace only that file if it already exists
- do not create any other project artifact
- do not modify words.txt, scene_hints.json, source code, documentation, ref/, or
  any unrelated file
- do not run any Git command
- confirm that the subject is not cut off and has generous white margin
- finish only after the exact target file exists as a valid opaque white-background PNG
{retry_note}
""".strip()


def build_image_command(
    references: Sequence[Path], codex_executable: Path
) -> list[str]:
    command = build_base_codex_command(codex_executable, "workspace-write")
    for reference in references:
        command.extend(("--image", str(reference)))
    command.extend(("--", "-"))
    return command


def flatten_png_to_white(path: Path) -> None:
    if Image is None:
        raise RuntimeError("Pillow is required to process PNG files")
    temporary_path = path.with_name(f".{path.name}.white.tmp")
    try:
        with Image.open(path) as image:
            image.load()
            rgba = image.convert("RGBA")
            flattened = Image.new("RGB", rgba.size, (255, 255, 255))
            flattened.paste(rgba, mask=rgba.getchannel("A"))
            flattened.save(temporary_path, format="PNG", optimize=True)
        temporary_path.replace(path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def validate_png(path: Path) -> PngValidation:
    if not path.is_file():
        return PngValidation(False, "target file does not exist")
    if Image is None:
        return PngValidation(False, "Pillow is required to validate PNG files")

    try:
        with Image.open(path) as probe:
            if probe.format != "PNG":
                return PngValidation(False, f"expected PNG, got {probe.format}")
            probe.verify()

        with Image.open(path) as image:
            image.load()
            width, height = image.size
            if width < 512 or height < 512:
                return PngValidation(
                    False, f"image is too small: {width}x{height}", width, height
                )
            if image.mode not in ("L", "RGB"):
                return PngValidation(
                    False,
                    f"PNG must be opaque grayscale or RGB, got mode {image.mode}",
                    width,
                    height,
                )

            rgb = image.convert("RGB")
            edge_values = (
                rgb.crop((0, 0, width, 1)).tobytes()
                + rgb.crop((0, height - 1, width, height)).tobytes()
                + rgb.crop((0, 1, 1, height - 1)).tobytes()
                + rgb.crop((width - 1, 1, width, height - 1)).tobytes()
            )
            edge_pixels = len(edge_values) // 3
            white_edge_pixels = sum(
                edge_values[offset] >= 247
                and edge_values[offset + 1] >= 247
                and edge_values[offset + 2] >= 247
                for offset in range(0, len(edge_values), 3)
            )
            edge_ratio = white_edge_pixels / max(edge_pixels, 1)
            if edge_ratio < 0.90:
                return PngValidation(
                    False,
                    f"white margin is too small ({edge_ratio:.1%} of edge pixels white)",
                    width,
                    height,
                )

            sample = rgb.copy()
            sample.thumbnail((256, 256), Image.Resampling.NEAREST)
            sample_bytes = sample.tobytes()
            colored = max_delta = 0
            sample_count = len(sample_bytes) // 3
            for offset in range(0, len(sample_bytes), 3):
                red, green, blue = sample_bytes[offset : offset + 3]
                delta = max(red, green, blue) - min(red, green, blue)
                max_delta = max(max_delta, delta)
                if delta > 48:
                    colored += 1
            colored_ratio = colored / max(sample_count, 1)
            if max_delta > 96 or colored_ratio > 0.005:
                return PngValidation(
                    False,
                    (
                        "visible color was detected "
                        f"(max channel delta {max_delta}, ratio {colored_ratio:.2%})"
                    ),
                    width,
                    height,
                )

            return PngValidation(
                True,
                f"valid {width}x{height} opaque white-background monochrome PNG",
                width,
                height,
            )
    except (OSError, UnidentifiedImageError, ValueError) as error:
        return PngValidation(False, f"PNG validation error: {error}")


def file_digest(path: Path) -> str | None:
    if not path.is_file():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def generate_word(
    word: str,
    scene_hint: str,
    references: Sequence[Path],
    run_stamp: str,
    codex_executable: Path,
) -> WordResult:
    output_path = OUTPUT_DIR / filename_for_word(word)
    previous_file_bytes = output_path.read_bytes() if output_path.is_file() else None
    original_digest = file_digest(output_path)
    previous_failure = None

    for attempt in range(1, RETRIES + 2):
        prompt = build_image_prompt(word, scene_hint, output_path, previous_failure)
        command = build_image_command(references, codex_executable)
        log_path = LOG_DIR / f"{run_stamp}-{filename_for_word(word)[:-4]}-attempt-{attempt}.log"
        print(f"\n[{word}] attempt {attempt}/{RETRIES + 1}")
        print(f"[{word}] output: {output_path}")
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        return_code, timed_out = stream_codex(command, prompt, word, log_path)

        if timed_out:
            previous_failure = "the Codex process timed out"
            continue
        if return_code != 0:
            previous_failure = f"Codex exited with status {return_code}; see {log_path}"
            if return_code == 2:
                break
            continue

        if file_digest(output_path) == original_digest:
            previous_failure = "target PNG was not replaced with a newly generated image"
            print(f"[{word}] validation failed: {previous_failure}", file=sys.stderr)
            continue
        try:
            flatten_png_to_white(output_path)
        except (OSError, RuntimeError, UnidentifiedImageError, ValueError) as error:
            previous_failure = f"could not flatten PNG onto white: {error}"
            print(f"[{word}] validation failed: {previous_failure}", file=sys.stderr)
            continue

        validation = validate_png(output_path)
        if validation.ok:
            return WordResult(
                word,
                "generated",
                f"{validation.message}; log: {log_path}",
            )

        previous_failure = validation.message
        print(f"[{word}] validation failed: {validation.message}", file=sys.stderr)

    if previous_file_bytes is not None:
        output_path.write_bytes(previous_file_bytes)
        restore_note = " Previous file was restored."
    else:
        restore_note = ""
    return WordResult(
        word,
        "failed",
        f"all {RETRIES + 1} attempts failed: {previous_failure}.{restore_note}".strip(),
    )


def print_summary(results: Sequence[WordResult]) -> None:
    print("\nSummary")
    print("-" * 72)
    for result in results:
        print(f"{result.word:<16} {result.status:<10} {result.message}")
    generated = sum(result.status == "generated" for result in results)
    failed = sum(result.status == "failed" for result in results)
    print("-" * 72)
    print(f"generated={generated}, failed={failed}")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) != 1:
        print("usage: python gen_with_codex.py", file=sys.stderr)
        return 2
    if Image is None:
        print("error: Pillow is required: python -m pip install Pillow", file=sys.stderr)
        return 2
    codex_executable = resolve_codex_executable()
    if codex_executable is None:
        print(
            "error: Codex CLI executable not found in PATH or the Codex Desktop "
            "installation directory",
            file=sys.stderr,
        )
        return 2

    try:
        words = read_words()
        references = validate_references()
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    print(f"project: {PROJECT_DIR}")
    print(f"codex: {codex_executable}")
    print(f"words.txt: {', '.join(words)}")
    print("phase 1/2: regenerate scene_hints.json with Codex")
    run_stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    try:
        scene_hints = regenerate_scene_hints(words, run_stamp, codex_executable)
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"scene hints: {SCENE_HINTS_PATH}")
    print("phase 2/2: generate one independent PNG per scene hint")
    results = [
        generate_word(
            word, scene_hints[word], references, run_stamp, codex_executable
        )
        for word in words
    ]
    print_summary(results)
    return 1 if any(result.status == "failed" for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
