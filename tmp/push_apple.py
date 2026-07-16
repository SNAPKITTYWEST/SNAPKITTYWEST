import base64, json, subprocess, tempfile, os

REPO = "SNAPKITTYWEST/SNAPKITTYWEST.github.io"

apple_html = open(r"C:\Users\jessi\SNAPKITTYWEST\tmp\apple.html", "r", encoding="utf-8").read()

encoded = base64.b64encode(apple_html.encode()).decode()
payload = {
    "message": "feat: apple.html — Apple II Universal Machine cockpit; Bifrost seal bridge + Woz Vault",
    "content": encoded
}
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
    json.dump(payload, f)
    fname = f.name
r = subprocess.run(['gh', 'api', f'repos/{REPO}/contents/apple.html', '-X', 'PUT', '--input', fname],
                   capture_output=True, text=True)
os.unlink(fname)
print("apple.html:", "OK" if r.returncode == 0 else r.stderr[:400])
