@echo off
rem cd /d %~dp0
pushd %~dp0
IF EXIST "C:/Program Files/Java/jre7/bin/java.exe" (GOTO JRE732)
IF EXIST "C:/Program Files (x86)/Java/jre7/bin/java.exe" (GOTO JRE764)
IF EXIST "C:/Program Files/Java/jre6/bin/java.exe" (GOTO JRE632)
IF EXIST "C:/Program Files (x86)/Java/jre6/bin/java.exe" (GOTO JRE664)
GOTO UNKNOWN
:JRE732
echo JRE7
set JAVA_PATH="C:/Program Files/Java/jre7/bin/"
GOTO EXEC
:JRE764
echo JRE7_x86
set JAVA_PATH="C:/Program Files (x86)/Java/jre7/bin/"
GOTO EXEC
:JRE632
echo JRE6
set JAVA_PATH="C:/Program Files/Java/jre6/bin/"
GOTO EXEC
:JRE664
echo JRE6_x86
set JAVA_PATH="C:/Program Files (x86)/Java/jre6/bin/"
GOTO EXEC
:UNKNOWN
echo UNKNOWN
set JAVA_PATH=
GOTO EXEC

:EXEC
%JAVA_PATH%java -version
echo 起動
echo %JAVA_PATH%java -jar 頑シミュ.jar
%JAVA_PATH%java -Xms128m -Xmx512m -jar 頑シミュ.jar
:END

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: 頑シミュ.jarをダブルクリックしても起動しない人の為の起動用ファイルです。
:: このファイルをダブルクリックしても起動しない場合は、
:: 25行目にjava.exeのあるフォルダを""で括って指定して下さい。（9行目など参照）
:: 
:: ※特殊な起動方法
:: 
:: ■Windowsの人でコンソールを立ち上げたくない場合
:: 　32行目を下記のように変更して下さい。
::
:: start "" %JAVA_PATH%javaw -Xms128m -Xmx512m -jar 頑シミュ.jar
::
:: ■利用メモリを増やす（設定次第で快適になりますが自己責任で。）
:: 　32行目のオプションにある数値を変更して下さい。
:: 　（-Xmsは最小使用メモリ、-Xmxは最大使用メモリ、下記は1024MB=1GBを指定）
::
:: %JAVA_PATH%java -Xms128m -Xmx1024m -jar 頑シミュ.jar
::
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
pause;