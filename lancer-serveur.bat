@echo off
chcp 65001 > nul
title Monopoly Banque FR - Serveur Local
echo =====================================================================
echo   🎩 MONOPOLY BANQUE FR - DÉMARRAGE DU SERVEUR
echo =====================================================================
echo.
echo 1. Compilation des derniers changements (build)...
call npm run build

echo.
echo 2. Lancement du serveur Node.js & WebSocket...
echo (Laissez cette fenêtre ouverte pendant toute la partie !)
echo.
node server.js
pause
