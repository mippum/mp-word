# word_image_gen - 환경 세팅 / 실행
#
#   make install   : 가상환경 생성 + 패키지 설치
#   make hints     : words.txt -> scene_hints.json
#   make images    : scene_hints.json -> new/*.png
#
VENV_DIR = .venv
PY_VERSION = 3.13

ifeq ($(OS),Windows_NT)
	SCRIPTS := $(VENV_DIR)\Scripts
	ORIGIN_PYTHON := py -$(PY_VERSION)
	PYTHON := $(SCRIPTS)\python.exe
	VENV_MARKER := $(VENV_DIR)\pyvenv.cfg
	RM_VENV := if exist "$(VENV_DIR)" rmdir /s /q "$(VENV_DIR)"
	RM_CACHE := for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
else
	SCRIPTS := $(VENV_DIR)/bin
	ORIGIN_PYTHON := python$(PY_VERSION)
	PYTHON := $(SCRIPTS)/python
	VENV_MARKER := $(VENV_DIR)/pyvenv.cfg
	RM_VENV := rm -rf $(VENV_DIR)
	RM_CACHE := find . -type d -name "__pycache__" -exec rm -rf {} +
endif

PIP := $(PYTHON) -m pip

.PHONY: help venv install freeze hints images clean clean-venv reset

help:
	@echo make venv       - create virtualenv (Python $(PY_VERSION))
	@echo make install    - venv + install requirements.txt
	@echo make freeze     - write installed packages to requirements.txt
	@echo make hints      - run gen_hints_with_codex.py
	@echo make images     - run gen_img_with_codex.py
	@echo make clean      - remove __pycache__
	@echo make clean-venv - remove .venv
	@echo make reset      - clean-venv + install

venv: $(VENV_MARKER)

$(VENV_MARKER):
	$(ORIGIN_PYTHON) -m venv $(VENV_DIR)
	$(PIP) install --upgrade pip

install: venv
	$(PIP) install -r requirements.txt

freeze: venv
	$(PIP) freeze > requirements.txt

hints: venv
	$(PYTHON) gen_hints_with_codex.py

images: venv
	$(PYTHON) gen_img_with_codex.py

clean:
	$(RM_CACHE)

clean-venv:
	$(RM_VENV)

reset: clean-venv install
