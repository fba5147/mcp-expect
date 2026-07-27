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
Sleep 5s

Sleep 1500ms

Type "npm run demo:fail"
Enter
Sleep 4s

Sleep 2500ms
