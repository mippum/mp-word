# gpt_en_dict_py




```text 
[{
	"word": "hello",
	"pronunciations": {
		"us": "helóu, hə-, hélou",
		"gb": "helóu, hə-, hélou"
	},
	"ko-repr": "안녕 / 안녕하세요"
}, {
	"word": "i",
	"pronunciations": {
		"us": "ai",
		"gb": "ai"
	},
	"ko-repr": "나"
}, {
	"word": "am",
	"pronunciations": {
		"us": "əm, (strong) æm",
		"gb": "əm, (strong) æm"
	},
	"ko-repr": "~이다 / ~에 있다"
}]
이러한 데이터 형태로 단어 사전을 만들까해.
gb 는 영국식을 나타내는 것이고, ko-repr 은 한국어 설명이야.
ko-repr 값은 짧게 해줘.

이 단어들을 하나씩 위 데이터 형태로 정의를 해줘.
the 
to 
of 
and
```

이후
```text
이 단어들도 해줘.
on 
said 
with
whistler
marino
toda
```

```sql 
select word from word_mpfpm
where mpfpm <= 62964.7
order by mpfpm desc
limit 1000;
```

빈줄을 복사했을 때, 내용 없애는 powershell 명령어
```sh 
if ((Get-Clipboard -Raw) -eq "`r`n" -or (Get-Clipboard -Raw) -eq "`n") { Set-Clipboard -Value ([string]"") }
```

```sh
echo '[]' > gpt_gen/01.json
echo '[]' > gpt_gen/02.json
echo '[]' > gpt_gen/03.json
echo '[]' > gpt_gen/04.json
echo '[]' > gpt_gen/05.json
echo '[]' > gpt_gen/06.json
echo '[]' > gpt_gen/07.json
echo '[]' > gpt_gen/08.json
echo '[]' > gpt_gen/09.json
echo '[]' > gpt_gen/10.json
echo '[]' > gpt_gen/11.json
echo '[]' > gpt_gen/12.json
echo '[]' > gpt_gen/13.json
echo '[]' > gpt_gen/14.json
echo '[]' > gpt_gen/15.json
echo '[]' > gpt_gen/16.json
echo '[]' > gpt_gen/17.json
echo '[]' > gpt_gen/18.json
echo '[]' > gpt_gen/19.json
echo '[]' > gpt_gen/20.json
```


