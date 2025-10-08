# gpt_en_dict_py


예제
```text
[{
	"word": "fish",
	"meaning": "an animal that lives in water, is covered with scales, and breathes by taking water in through its mouth, or the flesh of these animals eaten as food"
}, {
	"word": "cow",
	"meaning": "a large female farm animal kept to produce meat and milk"
}]

이런 형식으로 아래 단어들에 대해서 간단한 영어로 뜻을 정의해줘. 3 문장에서 7문장 정도로 해줘.
stoppable
siegfried
stopwatch
stow
reprint
sicily
siberian
sian
siamese
shutterbug
unrecept
```
이후
```text
이 단어들도 해줘.
want
eat
drink
get

```

```sql 
select word from word_mpfpm
where mpfpm <= 62964.7
order by mpfpm desc
limit 1000;
```

빈줄을 복사했을 때, 내용 없애는 powershell 명령어
```sh 
if ((Get-Clipboard) -match '^\s*$') { Set-Clipboard -Value "" }
```