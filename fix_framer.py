import os
import re

def fix_framer(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return
    
    new_content = re.sub(r'type:\s*\"spring\"(?!\s*as\s+any|\s*as\s+const)', 'type: \"spring\" as any', content)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

for root, _, files in os.walk('d:/Office-agent/frontend/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_framer(os.path.join(root, file))
print('Framer types fixed.')
