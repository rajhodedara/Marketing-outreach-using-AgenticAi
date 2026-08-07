import re

# Fix landing.html
filepath_html = 'd:/Office-agent/frontend/public/landing.html'
with open(filepath_html, 'r', encoding='utf-8') as f:
    html_content = f.read()

html_content = html_content.replace('ask-Armin-widget', 'ask-armin-widget')
html_content = html_content.replace('Armin-avatar-mini', 'armin-avatar-mini')
html_content = html_content.replace('Armin-mini-img', 'armin-mini-img')
html_content = html_content.replace('ask-Armin-text', 'ask-armin-text')

with open(filepath_html, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Fix style.css
filepath_css = 'd:/Office-agent/frontend/public/style.css'
with open(filepath_css, 'r', encoding='utf-8') as f:
    css_content = f.read()

css_content = css_content.replace('ask-julian-widget', 'ask-armin-widget')
css_content = css_content.replace('julian-avatar-mini', 'armin-avatar-mini')
css_content = css_content.replace('julian-mini-img', 'armin-mini-img')
css_content = css_content.replace('ask-julian-text', 'ask-armin-text')

with open(filepath_css, 'w', encoding='utf-8') as f:
    f.write(css_content)

print('Fixed widget classes and IDs')
