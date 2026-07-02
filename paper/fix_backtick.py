import sys
with open(r'C:\Users\jessi\IdeaProjects\SNAPKITTYWEST\paper\generate_redbook.py', 'r', encoding='utf-8') as f:
    content = f.read()
old = 'swiglu=""' + '`'
new = 'swiglu=""' + '""'
content = content.replace(old, new)
with open(r'C:\Users\jessi\IdeaProjects\SNAPKITTYWEST\paper\generate_redbook.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed')
