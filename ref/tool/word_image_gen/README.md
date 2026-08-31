# word_image_gen

영단어 장면 설명 생성과 흑백 선화 PNG 생성을 분리한 두 단계 파이프라인입니다.

## 실행

두 스크립트는 명령행 단어나 옵션을 받지 않으며 서로 독립적으로 실행됩니다.

```bash
python gen_hints_with_codex.py
python gen_img_with_codex.py
```

첫 번째 명령은 `words.txt`로 `scene_hints.json`만 만듭니다. 두 번째 명령은
`scene_hints.json`만 읽어 `new/*.png`를 만듭니다. 따라서 이미지를 확인한 뒤 JSON의
장면 설명이나 추론 수준을 직접 수정하고 이미지 생성만 다시 실행할 수 있습니다.

## 1단계: 장면 설명 생성

`gen_hints_with_codex.py`는 다음 순서로 동작합니다.

1. `words.txt`를 읽고 중복·잘못된 단어·파일명 충돌을 검사합니다.
2. 한 번의 비대화형 Codex 실행으로 모든 단어의 구체적인 장면 설명을 생성합니다.
3. 구조화된 JSON 응답의 키와 값을 검사합니다.
4. 추론 설정과 검증된 전체 결과만 `scene_hints.json`에 원자적으로 저장합니다.

`words.txt`에는 단어를 한 줄에 하나씩 적습니다. 빈 줄과 `#`으로 시작하는 주석을
무시하며, 쉼표로 여러 단어를 적는 형식도 허용합니다.

```text
native
becoming
absolutely
```

`scene_hints.json` 생성에 실패하면 기존 파일을 교체하지 않습니다. 이 스크립트는
이미지를 생성하거나 `new/`를 수정하지 않습니다.

## scene_hints.json 형식

```json
{
  "reasoning_effort": "medium",
  "scene_hints": {
    "available": "A passenger reaches toward the only empty seat on a crowded bus."
  }
}
```

`reasoning_effort`는 힌트 생성과 이미지 생성 Codex 작업에 공통 적용됩니다. 사용할 수
있는 값은 `none`, `low`, `medium`, `high`, `xhigh`, `max`이며 기본값은 `medium`입니다.
가장 빠르게 실행하려면 `none`, 가장 깊게 추론하게 하려면 `max`를 사용합니다.
기존 JSON의 값을 바꾸고 `gen_hints_with_codex.py`를 실행하면 해당 설정을 보존해
힌트를 다시 만들고, `gen_img_with_codex.py`를 실행하면 해당 설정으로 그림을 만듭니다.

## 2단계: 이미지 생성

`gen_img_with_codex.py`는 `words.txt`를 읽지 않습니다. `scene_hints.json` 안의
`scene_hints` 객체에서 키를 단어 목록으로, 값을 장면 지시로 사용합니다. 파일을 실행할
때마다 JSON을 새로 읽으므로 이미지 결과를 보고 장면 문장을 고친 뒤 곧바로 다시
생성할 수 있습니다.

각 단어마다 별도의 Codex 작업을 순차 실행하며 `new/<word>.png`를 만듭니다.

- `ref/abandon.png`, `ref/able.png`, `ref/operations.png`를 스타일 참고로 사용
- 최소한의 검은 선, 완전히 불투명한 흰색 배경, 충분한 흰 여백
- 색상·회색 음영·그라데이션·그림자·텍스처 없음
- 글자·숫자·라벨·로고·워터마크·격자·분할 패널 없음
- 기존 정상 PNG도 저장된 장면 지시를 반영하도록 다시 생성

생성 결과에 투명 픽셀이 남아 있어도 Pillow로 순백색 위에 합성한 RGB PNG로 다시
저장합니다. 이후 무결성, 최소 크기, 불투명 형식, 흰 여백, 눈에 띄는 색상을
검사합니다. 한 단어가 최종 실패하면 이전 PNG를 복원하고 다음 단어를 계속 처리합니다.

## 요구 사항

- Python 3.10 이상
- Pillow
- 로그인된 Codex CLI 또는 Codex Desktop 앱
- Codex에서 imagegen 스킬과 내장 이미지 생성 도구를 사용할 수 있는 환경

두 스크립트는 먼저 `PATH`에서 `codex`를 찾고, 없으면 Windows의 Codex Desktop
설치 폴더(`%LOCALAPPDATA%\\OpenAI\\Codex\\bin`)를 자동으로 탐색합니다. Codex에는
완성된 프롬프트를 자동으로 전달하므로 실행 중 사용자가 추가 내용을 입력할 필요가
없습니다.

시도별 기록은 `logs/`에 저장됩니다. Git 작업은 사용자가 직접 관리하며, 스크립트와
하위 Codex 작업은 Git 명령을 실행하지 않습니다.
