# gpt_en_dict_py




```text 
{
	"word": "hello",
	"pronunciations": [{
		"us": "helóu, hə-, hélou",
		"gb": "helóu, hə-, hélou"
	}],
	"ko-repr": "안녕 / 안녕하세요"
}, {
	"word": "i",
	"pronunciations": [{
		"us": "ai",
		"gb": "ai"
	}],
	"ko-repr": "나"
}, {
	"word": "am",
	"pronunciations": [{
		"us": "əm, (strong) æm",
		"gb": "əm, (strong) æm"
	}],
	"ko-repr": "동사 am은 be 동사의 한 형태. 주어가 1인칭 단수(I)일 때 현재 시제일 때 사용\nbe 동사\n - ~이다 (정체, 성질, 상태)\n - ~에 있다 (장소, 위치)\n - ~하고 있다 (진행형 만들 때 조동사 역할)\nam 이외에도 are(2인칭 단수, 복수), is(3인칭 단수) 가 있고, 시제(과거, 현재, 미래)에 따라 형태가 변화한다."
}
이러한 데이터 형태로 단어 사전을 만들까해.
gb 는 영국식을 나타내는 것이고, ko-repr 은 한국어 설명이야.

이 단어들을 하나씩 위 데이터 형태로 정의를 해줘.
the 
to 
of 
and  
in 
it 
for 
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



