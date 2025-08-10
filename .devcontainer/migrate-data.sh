#!/bin/bash

# Migration script to copy existing data to persistent volume
echo "🔄 Migrating existing data to persistent volume..."

# Create persistent directories
mkdir -p /persistent/{.config,.cache/pip,.vscode-server,.oh-my-zsh,.claude}

# Copy existing data if it exists and persistent directories are empty
if [ -d "/tmp/.config" ] && [ ! "$(ls -A /persistent/.config 2>/dev/null)" ]; then
    echo "📁 Copying .config..."
    cp -r /tmp/.config/* /persistent/.config/ 2>/dev/null || true
fi

if [ -d "/tmp/.cache/pip" ] && [ ! "$(ls -A /persistent/.cache/pip 2>/dev/null)" ]; then
    echo "📦 Copying pip cache..."
    cp -r /tmp/.cache/pip/* /persistent/.cache/pip/ 2>/dev/null || true
fi

if [ -d "/tmp/.vscode-server" ] && [ ! "$(ls -A /persistent/.vscode-server 2>/dev/null)" ]; then
    echo "🆚 Copying VSCode server..."
    cp -r /tmp/.vscode-server/* /persistent/.vscode-server/ 2>/dev/null || true
fi

if [ -d "/tmp/.oh-my-zsh" ] && [ ! "$(ls -A /persistent/.oh-my-zsh 2>/dev/null)" ]; then
    echo "🐚 Copying Oh My Zsh..."
    cp -r /tmp/.oh-my-zsh/* /persistent/.oh-my-zsh/ 2>/dev/null || true
fi

if [ -d "/tmp/.claude" ] && [ ! "$(ls -A /persistent/.claude 2>/dev/null)" ]; then
    echo "🤖 Copying Claude config..."
    cp -r /tmp/.claude/* /persistent/.claude/ 2>/dev/null || true
fi

if [ -f "/tmp/.zsh_history" ] && [ ! -f "/persistent/.zsh_history" ]; then
    echo "📜 Copying shell history..."
    cp /tmp/.zsh_history /persistent/.zsh_history 2>/dev/null || true
fi

echo "✅ Migration complete!"