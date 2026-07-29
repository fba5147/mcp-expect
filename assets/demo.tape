Output assets/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 720
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 40ms

Hide
Type "export PS1='$ '"
Enter
Type "clear"
Enter
Show

Type "npm run test:example"
Enter
Sleep 3500ms

Sleep 1500ms
Hide
Type "clear"
Enter
Show

Type "npm run test:filesystem-server"
Enter
Sleep 3500ms

Sleep 1500ms
Hide
Type "clear"
Enter
Show

Type "npm run demo:fail"
Enter
Sleep 3500ms

Sleep 1500ms
Hide
Type "clear"
Enter
Show

Type "npm run demo:security-fail"
Enter
Sleep 3500ms

Sleep 2500ms
