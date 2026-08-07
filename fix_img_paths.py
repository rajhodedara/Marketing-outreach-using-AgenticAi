import re
filepath = 'd:/Office-agent/frontend/public/landing.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Luna-portrait.png', 'luna-portrait.png')
content = content.replace('Armin-portrait.png', 'armin-portrait.png')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed image paths')
