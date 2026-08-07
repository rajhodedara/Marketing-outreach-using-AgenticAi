filepath = 'd:/Office-agent/frontend/public/main.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace PascalCase
content = content.replace('Nova', 'Luna')
content = content.replace('Julian', 'Armin')

# Replace lowercase (since JS variables and IDs use lowercase)
content = content.replace('nova', 'luna')
content = content.replace('julian', 'armin')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated main.js')
