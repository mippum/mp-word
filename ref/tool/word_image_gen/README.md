# word_image_gen

words.txt에 적힌 영단어를 흑백 선화 PNG로 생성하는 고정 파이프라인입니다.

## 실행

실행 명령은 하나뿐입니다: python gen_with_codex.py
명령행 단어, 옵션, 별도 입력 파일은 받지 않습니다.

## 입력

words.txt에 단어를 한 줄에 하나씩 적습니다. 빈 줄과 #으로 시작하는 주석은
무시하며, 쉼표로 여러 단어를 적는 형식도 허용합니다.

예: native, becoming, absolutely

## 처리 순서

1. words.txt를 읽고 중복·잘못된 단어·파일명 충돌을 검사합니다.
2. 한 번의 비대화형 Codex 실행으로 모든 단어의 구체적인 장면 설명을 생성합니다.
3. 구조화된 JSON 응답을 검사한 뒤 scene_hints.json을 완전히 교체합니다.
4. 저장된 scene_hints.json을 다시 읽습니다.
5. 각 단어마다 독립적인 Codex 이미지 생성 작업을 순차 실행합니다.
6. 결과의 투명 영역을 흰색으로 합성해 new/<word>.png에 저장하고 크기·색상을 검사합니다.

scene_hints.json 생성에 실패하면 기존 파일을 사용해 그림을 만들지 않고 전체 실행을
중단합니다. 따라서 새 PNG는 항상 이번 실행에서 새로 생성되고 검증된 장면 설명을
사용합니다.

## scene_hints.json

키는 words.txt의 단어, 값은 Codex가 만든 영어 장면 설명입니다. 스크립트에 장면
설명을 하드코딩하지 않습니다. 실행할 때마다 Codex가 전체 JSON을 다시 만들며,
누락 키·추가 키·짧거나 잘못된 값이 있으면 재시도합니다.

Codex CLI의 비대화형 실행, 출력 스키마, 마지막 메시지 저장 기능을 이용해 JSON을
받습니다. 검증된 내용만 scene_hints.json에 원자적으로 저장합니다.

## 이미지 생성 규칙

- 한 단어당 한 작업, 한 장면, 한 PNG
- ref/abandon.png, ref/able.png, ref/operations.png를 고정 스타일 참고로 사용
- 최소한의 검은 선, 완전히 불투명한 흰색 배경, 충분한 흰 여백
- 색상·회색 음영·그라데이션·그림자·텍스처 없음
- 글자·숫자·라벨·로고·워터마크·격자·분할 패널 없음
- 기존 정상 PNG도 새 scene_hints.json을 반영하도록 다시 생성

Codex 결과에 투명 픽셀이 남아 있어도 Pillow로 순백색 위에 합성한 RGB PNG로 다시
저장합니다. 이후 무결성, 최소 크기, 불투명 형식, 흰 여백, 눈에 띄는 색상을 검사합니다.
한 단어가 최종 실패하면 이전 PNG를 복원하고 다음 단어를 계속 처리합니다.

## 요구 사항

- Python 3.10 이상
- Pillow
- 로그인된 Codex CLI 또는 Codex Desktop 앱

스크립트는 먼저 `PATH`에서 `codex`를 찾고, 없으면 Windows의 Codex Desktop 설치
폴더(`%LOCALAPPDATA%\\OpenAI\\Codex\\bin`)를 자동으로 탐색합니다. 따라서 IDE나
가상환경이 Codex Desktop의 `PATH`를 물려받지 않아도 같은 실행 명령을 사용합니다.
Codex 작업에는 완성된 프롬프트를 자동으로 전달하며, 실행 중 사용자가 표준입력에
추가 내용을 입력할 필요가 없습니다.
- Codex에서 imagegen 스킬과 내장 이미지 생성 도구를 사용할 수 있는 환경

시도별 기록은 logs/에 저장됩니다. Git 작업은 사용자가 직접 관리하며, 스크립트와
하위 Codex 작업은 Git 명령을 실행하지 않습니다.
