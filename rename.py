import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        return

    # Fix powershell corruption (the ?" was likely from encoding issues)
    content = content.replace('?"', '—').replace('?', '—')

    # Replace Nova & Julian -> OutReach<span style="font-size: 1.15em;">X</span> (only in HTML)
    if filepath.endswith('.html'):
        content = content.replace('Luna & Armin', 'OutReach<span style="font-size: 1.15em;">X</span>')
        content = content.replace('Luna &amp; Armin', 'OutReach<span style="font-size: 1.15em;">X</span>')

    # Replace Nova -> Luna, Julian -> Armin in UI text
    content = content.replace('Nova', 'Luna')
    content = content.replace('Julian', 'Armin')
    
    # Also replace in paths just to be safe
    content = content.replace('nova-portrait.png', 'luna-portrait.png')
    content = content.replace('julian-portrait.png', 'armin-portrait.png')
    content = content.replace('julian-greeting.mp3', 'armin-greeting.mp3')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('d:/Office-agent/frontend/public/landing.html')

for root, _, files in os.walk('d:/Office-agent/frontend/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            replace_in_file(os.path.join(root, file))

print('Replacement complete.')
