import re

filepath = 'd:/Office-agent/frontend/public/landing.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix IDs in landing.html that got capitalized
content = content.replace('id="link-hire-Luna"', 'id="link-hire-luna"')
content = content.replace('id="link-hire-Armin"', 'id="link-hire-armin"')

content = content.replace('id="Luna-card"', 'id="luna-card"')
content = content.replace('id="Armin-card"', 'id="armin-card"')

content = content.replace('id="Luna-ticker-text"', 'id="luna-ticker-text"')
content = content.replace('id="Armin-ticker-text"', 'id="armin-ticker-text"')

content = content.replace('id="Luna-bubble"', 'id="luna-bubble"')
content = content.replace('id="Armin-bubble"', 'id="armin-bubble"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed IDs in landing.html')
