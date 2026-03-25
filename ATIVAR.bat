@echo off
set /p CODE="Cole o Codigo da Nuvemshop aqui e de ENTER: "

echo Trocando codigo por token...
curl.exe -k -X POST https://www.tiendanube.com/apps/authorize/token -H "Content-Type: application/json" -d "{\"client_id\":\"28353\",\"client_secret\":\"53fd680a9b442ac1fffea98076ee1868f17475fa42dd3a83\",\"grant_type\":\"authorization_code\",\"code\":\"%CODE%\"}"

echo.
echo Se apareceu um texto com "access_token", deu certo!
pause
