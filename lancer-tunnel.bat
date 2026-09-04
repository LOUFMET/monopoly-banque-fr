@echo off
chcp 65001 > nul
title Monopoly Banque FR - Tunnel Public (Pour jouer chez vos amis)
echo =====================================================================
echo   🌐 MONOPOLY BANQUE FR - OUVERTURE DU TUNNEL INTERNET
echo =====================================================================
echo.
echo Ce script rend votre serveur accessible depuis n'importe quel smartphone.
echo Assurez-vous que "lancer-serveur.bat" est bien lance dans une autre fenetre !
echo.
echo Generation de l'adresse web publique en cours...
echo.
npx localtunnel --port 3000
pause
