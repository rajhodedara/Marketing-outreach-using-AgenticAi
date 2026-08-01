import os

def generate_context(output_file):
    ignore_dirs = {
        '.git', 'node_modules', '.next', '__pycache__', '.venv', 'venv', 
        'env', '.vscode', '.idea', 'build', 'dist', 'temp-backup', 
        'frontend_old', 'coverage'
    }
    ignore_extensions = {
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.lock',
        '.pdf', '.zip', '.tar', '.gz', '.mp4', '.mp3', '.wav'
    }
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Write Tree Structure
        outfile.write("# Project Structure\n\n```\n")
        
        for root, dirs, files in os.walk('.'):
            # Prune ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            level = root.replace('.', '').count(os.sep)
            indent = ' ' * 4 * (level)
            outfile.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                outfile.write(f"{subindent}{f}\n")
        
        outfile.write("```\n\n# File Contents\n\n")
        
        # Write file contents
        for root, dirs, files in os.walk('.'):
            # Prune ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]
            
            for f in files:
                if any(f.endswith(ext) for ext in ignore_extensions):
                    continue
                if f in ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'project_context.txt']:
                    continue
                    
                file_path = os.path.join(root, f)
                # Ignore the script itself and the output file
                if f == 'generate_context.py' or file_path == os.path.join('.', output_file):
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    outfile.write(f"## {file_path}\n\n")
                    outfile.write(f"```\n{content}\n```\n\n")
                except Exception as e:
                    outfile.write(f"## {file_path}\n\n")
                    outfile.write(f"Error reading file: {e}\n\n")

if __name__ == '__main__':
    generate_context('project_context.txt')
    print("Generated project_context.txt successfully.")
