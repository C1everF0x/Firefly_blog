---
title: "服务器解析漏洞小结"
published: 2021-02-18
tags: ["Web安全"]
category: "学习笔记"
image: api
---

> 写在前面
>
> 之前打靶机有利用到过一些解析漏洞，最近跟着涅普的视频过一遍基础，发现师傅整理出来的文章很不错，转载一下

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218003459.png)

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20210218004849.png)

# 一、IIS5.x-6.x解析漏洞

使用`iis5.x-6.x`版本的服务器，**大多为 windows server 2003**，网站比较古老，开发语句一般为 `asp` ;该解析漏洞也只能解析 `asp` 文件，而不能解析` aspx `文件。

## 目录解析(6.0)
目录名包含`.asp .asa .cer`这种字样，该目录下所有文件都被当做asp来进行解析
例如：在网站下创建文件夹名字为.asp、.asa的文件夹，其目录内的任何扩展名的文件都被IIS当做asp文件来解析并执行。
形式：www.xxx.com/xx.asp/xx.jpg

## 文件解析
形式：www.xxx.com/xx.asp;.jpg（文件名）
原理：服务器默认不解析;号后面的内容，因此`xx.asp;.jpg`便被解析成asp文件了。

## 解析文件类型

`IIS6.0` 默认的可执行文件除了`asp`还包含这三种 :`.asa` `.cdx` `.cer`

例如：

1. `test.asa`
2. `test.cer`
3. `test.cdx`

## Iis7.5解析漏洞(php.ini开启cgi.fix_pathinfo)

```
.php --> /xx.jpg         //上传.jpg一句话，访问时后面加上/xx.php 
```

# 二、apache解析漏洞

## 1. %00截断上传漏洞

`PHP 5.2` 存在截断上传 (0x00) (%00)，`PHP 5.3` 之后就没有了该漏洞

## 2. 多后缀解析

一个文件名为 test.x1.x2.x3 的文件，Apache会从x3的位置往x1的位置开始尝试解析，如果x3不属于 Apache解析的扩展名，那么Apache会尝试去解析x2， 这样一直往前尝试，直到遇到一个能解析的扩展名为止。

例如：Web应用限制了php等敏感后缀，我们通过可以上传一个文件名为 `test.php.jpg` 的文件，访问时，Apache会因为无法解析jpg，而向前寻找可以解析的后缀，这时便找到php，那么按照php文件进行正常解析，从而使木马被执行。

## 3. 其他后缀解析

```
<FilesMatch ".+\.ph(p[345]?|t|tml)$">
    SetHandler application/x-httpd-php
</FilesMatch>
```

`".+\.ph(p[345]?|t|tml)$"` 该正则表达式匹配的不仅仅有php，还有php3、php4、php5、pht和phtml，这些都是Apache和php认可的php程序的文件后缀。如果网站仅对php进行了防护，那么我们可以改为这些不大常见的后缀，同样完成解析。

例如：`test.php3 、 test.pt 、 test.ptml`

## 4.  .htaccess解析

> htaccess文件是Apache服务器中的一个配置文件，它负责相关目录下的网页配置。通过htaccess文件，可以帮我们实现：网页301重定向、自定义404错误页面、改变文件扩展名、允许/阻止特定的用户或者目录的访问、禁止目录列表、配置默认文档等功能。

```
启用.htaccess，需要修改httpd.conf，启用AllowOverride，并可以用AllowOverride限制特定命令的使用。
```

如果在Apache中.htaccess可被执行.且可被上传.那可以尝试在.htaccess中写入：`AddType application/x-httpd-php xxx` ，这时上传`.xxx`后缀的文件，就会当成php解析。

或者

```
  <FilesMatch "test.jpg">
    SetHandler application/x-httpd-php
  </FilesMatch>
```

当Web应用匹配到名为 test.jpg 文件时，同样会当成php解析。

# 三、nginx解析漏洞

## 漏洞原理
Nginx 默认是以 CGI 的方式支持 PHP 解析的，普遍的做法是在 Nginx 配置文件中通过正则匹配设置 `SCRIPT_FILENAME` 。当访问www.xx.com/phpinfo.jpg/1.php这个URL时，`$fastcgi_script_name`会被设置为 `“phpinfo.jpg/1.php”`，然后构造成` SCRIPT_FILENAME` 传递给 PHP CGI，但是 PHP 为什么会接受这样的参数，并将 `phpinfo.jpg` 作为 `PHP 文件`解析呢?

这就要说到 `fix_pathinfo` 这个选项了。 如果开启了这个选项，那么就会触发在 PHP 中的如下逻辑：
PHP 会认为 `SCRIPT_FILENAME` 是` phpinfo.jpg`，而 `1.php` 是`PATH_INFO`，所以就会将 `phpinfo.jpg` 作为`PHP文件`来解析了

>Nginx 的解析漏洞实质上是实际上是`PHP CGI解析漏洞`。
>这不是 Nginx 特有的漏洞，在`IIS7.0`、`IIS7.5`、`Lighttpd`等 Web 容器中也经常会出现这样的解析漏洞。

## 漏洞形式
www.xxxx.com/UploadFiles/image/1.jpg/1.php
www.xxxx.com/UploadFiles/image/1.jpg%00.php
(www.xxxx.com/UploadFiles/image/1.jpg/%20\0.php)

另外一种手法：上传一个名字为 test.jpg ，然后访问 test.jpg/.php ,在这个目录下就会生成一句话木马 shell.php 。

nginx 解析漏洞(php.ini开启fix_pathinfo)

```
.php --> xxx.jpg%00.php      //Nginx <8.03 空字节代码执行漏洞
```

# 四、IIS7.5解析漏洞

IIS7.5的漏洞与 nginx 的类似，都是由于 php 配置文件中，开启了`cgi.fix_pathinfo`，而这并不是 nginx 或者 iis7.5本身的漏洞。
