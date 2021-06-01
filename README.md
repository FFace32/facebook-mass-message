# facebook-mass-message

Send a mass message on Facebook with the help of [ts-messenger-api](https://github.com/makiprogrammer/ts-messenger-api).

## Usage

Make sure you have [Node.js](https://nodejs.org) installed then:
```
1. Clone or download this repository.
2. Make sure the current directory is the downloaded repository.
3. npm install
4. node index
5. Have fun with the web interface.
```

## Formatting the message

The message can contain variables and [spintax](http://umstrategies.com/what-is-spintax).  
The format for using a variable is `%variable name%` and the format for using (nested) spintax is `{part1|{part2a|part2b}|part3}`.  
Here are some examples:
- `Hello {world|worlds}!` outputs `Hello world!` or `Hello worlds!`
- Implying you have a `color` variable with the value of `green`:  
    - `Hello %color% world!` outputs `Hello green world!`
    - `The {sky|grass} is %color%.` outputs `The sky is green.` or `The grass is green.`

## <img src="https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/apple/198/flag-for-romania_1f1f7-1f1f4.png" alt="Romania" title="Romania" width="32" height="32" /> Utilizare

<a href="http://www.youtube.com/watch?v=-r09dm2GgwU"><img src="https://user-images.githubusercontent.com/51804529/90344680-84d1ae00-e024-11ea-8d69-95aaa7ead1b6.png" alt="Utilizare" title="Utilizare" width="640" height="360" /></a>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
