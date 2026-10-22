import subprocess,os,json,urllib.request,base64
exe=r'C:\Program Files\Git\mingw64\bin\git-credential-manager.exe'
env=os.environ.copy();env['GCM_INTERACTIVE']='Never';env['GIT_TERMINAL_PROMPT']='0'
r=subprocess.run([exe,'get'],input='protocol=https\nhost=github.com\n\n',capture_output=True,text=True,env=env,timeout=25)
fields=dict(line.split('=',1) for line in r.stdout.splitlines() if '=' in line)
if 'password' not in fields:
 print('No available HTTPS credential; exit',r.returncode);raise SystemExit(2)
token=fields['password'];auth='Basic '+base64.b64encode((fields.get('username','git')+':'+token).encode()).decode()
req=urllib.request.Request('https://api.github.com/repos/Sofusan01/SMS-Sofuto-Mangement-System',headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'SMS-push'})
with urllib.request.urlopen(req,timeout=20) as response: repo=json.load(response)
print('Repository:',repo['full_name'],'private:',repo['private'])
if not repo['private']: raise SystemExit('Repository is not private; not uploading.')
env['GIT_CONFIG_COUNT']='2';env['GIT_CONFIG_KEY_0']='http.extraHeader';env['GIT_CONFIG_VALUE_0']='Authorization: '+auth;env['GIT_CONFIG_KEY_1']='credential.helper';env['GIT_CONFIG_VALUE_1']=''
r=subprocess.run(['git','ls-remote','https://github.com/Sofusan01/SMS-Sofuto-Mangement-System.git'],env=env,capture_output=True,text=True,timeout=30)
print(r.stdout);print('Remote check exit:',r.returncode)
if r.returncode: raise SystemExit(3)
