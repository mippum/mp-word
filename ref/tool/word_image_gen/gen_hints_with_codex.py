from __future__ import annotations

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
from datetime import datetime
from pathlib import Path
from typing import Sequence


PROJECT_DIR = Path(__file__).resolve().parent
WORDS_PATH = PROJECT_DIR / "words.txt"
SCENE_HINTS_PATH = PROJECT_DIR / "scene_hints.json"
LOG_DIR = PROJECT_DIR / "logs"

TIMEOUT_SECONDS = 20 * 60
RETRIES = 2
DEFAULT_REASONING_EFFORT = "medium"
REASONING_EFFORTS = ("none", "low", "medium", "high", "xhigh", "max")

WORD_PATTERN = re.compile(r"^[A-Za-z][A-Za-z'-]*$")
WINDOWS_RESERVED_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{number}" for number in range(1, 10)),
    *(f"LPT{number}" for number in range(1, 10)),
}


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
            candidates.extend(
                sorted(
                    desktop_bin.glob("*/codex.exe"),
                    key=lambda path: path.stat().st_mtime,
                    reverse=True,
                )
            )
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


def validate_reasoning_effort(value: object) -> str:
    if not isinstance(value, str) or value not in REASONING_EFFORTS:
        allowed = ", ".join(REASONING_EFFORTS)
        raise ValueError(f"reasoning_effort must be one of: {allowed}")
    return value


def load_reasoning_effort() -> str:
    if not SCENE_HINTS_PATH.is_file():
        return DEFAULT_REASONING_EFFORT
    payload = json.loads(SCENE_HINTS_PATH.read_text(encoding="utf-8-sig"))
    if not isinstance(payload, dict):
        raise ValueError("scene_hints.json must be a JSON object")
    # A flat object is the legacy format used before reasoning settings were added.
    if "reasoning_effort" not in payload:
        return DEFAULT_REASONING_EFFORT
    return validate_reasoning_effort(payload["reasoning_effort"])


def build_codex_command(
    codex_executable: Path, reasoning_effort: str
) -> list[str]:
    reasoning_effort = validate_reasoning_effort(reasoning_effort)
    return [
        str(codex_executable),
        "exec",
        "--ephemeral",
        "--color",
        "never",
        "--skip-git-repo-check",
        "--cd",
        str(PROJECT_DIR),
        "--config",
        f'model_reasoning_effort="{reasoning_effort}"',
        "--sandbox",
        "read-only",
    ]


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
            word: {"type": "string", "minLength": 30, "maxLength": 500}
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


def write_scene_hints(
    reasoning_effort: str, scene_hints: dict[str, str]
) -> None:
    document = {
        "reasoning_effort": validate_reasoning_effort(reasoning_effort),
        "scene_hints": scene_hints,
    }
    temporary_path = SCENE_HINTS_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary_path.replace(SCENE_HINTS_PATH)


def regenerate_scene_hints(
    words: Sequence[str],
    reasoning_effort: str,
    run_stamp: str,
    codex_executable: Path,
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
            command = build_codex_command(codex_executable, reasoning_effort)
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
                write_scene_hints(reasoning_effort, scene_hints)
                return scene_hints
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


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) != 1:
        print("usage: python gen_hints_with_codex.py", file=sys.stderr)
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
        reasoning_effort = load_reasoning_effort()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    print(f"project: {PROJECT_DIR}")
    print(f"codex: {codex_executable}")
    print(f"words.txt: {', '.join(words)}")
    print(f"reasoning effort: {reasoning_effort}")
    print("generate scene_hints.json with Codex")
    run_stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    try:
        scene_hints = regenerate_scene_hints(
            words, reasoning_effort, run_stamp, codex_executable
        )
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"scene hints: {SCENE_HINTS_PATH}")
    print(f"generated={len(scene_hints)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
