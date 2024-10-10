import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

function App() {
  const terminalRef = useRef(null);
  const [currPath, setCurrPath] = useState([]);

  const [fileSys, setFileSys] = useState({
    type: 'directory',
    contents: {
      "about_me": {
        type: 'directory',
        contents: {
          "links.txt": {
            type: 'file',
            content: '\x1b]8;;https://www.linkedin.com/in/shreyaas14/\x1b\\Linkedin\x1b]8;;\x1b\\, \x1b]8;;https://nyubnf.com/\x1b\\BNF Website\x1b]8;;\x1b\\',
          },
          "interests.txt": {
            type: 'file',
            content: 'Machine Learning, Distributed Systems, Blockchain',
          }, 
          "currently_reading.txt": {
            type: 'file',
            content: ['',
              'Designing Data-Intensive Applications - Martin Kleppmann',
              'Operating Systems: Three Easy Pieces - Andrea Arpaci-Dusseau and Remzi Arpaci-Dusseau']
              .join('\r\n'),
          },
          "experiences.txt": {
            type: 'file',
            content: ['', 
              "\x1b[1;34mInstitutional - Reporting & Monetization @ Coinbase: Backend Software Engineering Intern\x1b[0m",
               "\x1b[1;32mTest Engineering Division @ Georgia Tech Research Institute: Software Engineering Intern\x1b[0m",
               "\x1b[1;37mCommvault: Software Engineering Intern\x1b[0m",
               "\x1b[1;37mAirGap @ Arrosoft Solutions: Software Engineering Intern\x1b[0m",
              ].join("\r\n"),
          },
          "ec.txt": {
            type: 'file',
            content: ['', 
              "\x1b[1;35mML Research Intern @ NYU Stern Operations Management\x1b[0m",
               "\x1b[1;35mHead of Development, prev Marketing Director, Development Team Member @ NYU Blockchain & Fintech Club\x1b[0m",
               "\x1b[1;32mprev Insight Team Project Manager, Advanced Team Member, Insight Team Member @ NYU Stern Business & Analytics Club\x1b[0m",
               "\x1b[1;37mprev Head of Engineering @ NYU Math Finance Group\x1b[0m",
              ].join("\r\n"),
          },
        },
      },
      "projects.txt": {
        type: 'file',
        content: 'Find my projects on my \x1b]8;;https://github.com/Shreyaas14\x1b\\GitHub\x1b]8;;\x1b\\!',
      },
      /*
      "blog": {
        type: 'directory',
        contents: {},
      },*/
    },
  });
  

  const getCurrDir = useCallback(() => {
    let dir = fileSys;
  
    for (const part of currPath) {
      if (dir.contents && dir.contents[part]) {
        dir = dir.contents[part];
      } else {
        return null;
      }
    }

    return dir;
  }, [currPath, fileSys]);
  
  
  useEffect(() => {
    fetch('/api/posts')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP Error: status: {response.status}`)
        }
        return response.json();
      })
      .then(data => {
        const posts = data.posts;
        const updatedBlogContents = {};
        posts.forEach((post, index) => {
          updatedBlogContents[`post${index + 1}`] = {
            type: 'file',
            content: post.content,
          };
        });
  
        setFileSys(prevFileSys => {
          const updatedFileSys = {
            ...prevFileSys,
            contents: {
              ...prevFileSys.contents,
              blog: {
                ...prevFileSys.contents.blog,
                contents: updatedBlogContents,
              },
            },
          };
          return updatedFileSys;
        });
      })
      .catch(error => console.error('Error fetching blog posts:', error));
  }, []);  

  useEffect(() => {
    if (terminalRef.current) {
      const terminal = new Terminal({
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
        },
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 'normal',
        fontWeightBold: 'bold',
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current);

      // Welcome message
      fitAddon.fit();
      terminal.writeln("\x1b[1;35mShreyaas' Website\x1b[0m");
      terminal.writeln("Type 'help' to see available commands.");
      terminal.writeln("NOTE: I did not distinguish if something is a file or a directory. So experiment and see what works!")

      terminal.prompt = () => {
        let path = '/' + currPath.join('/');
        terminal.write(`\r\n${path}$ `);
      };
      terminal.prompt();

      let command = '';
      terminal.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
        if (domEvent.keyCode === 13) {
          handleCommand(command);
          command = '';
          terminal.prompt();
        } else if (domEvent.keyCode === 8) {
          if (command.length > 0) {
            command = command.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (printable) {
          command += key;
          terminal.write(key);
        }
      });

      const handleCommand = (cmd) => {
        const args = cmd.trim().split(' ');
        const command = args[0];
        args.shift();

        switch (command) {
          case 'help':
            terminal.writeln([
              '',
              'cd - enter a directory',
              "ls - display a directory's current options",
              'clear - clear the terminal',
              'cat - read a file',
            ].join('\r\n'));
            break;
          case 'cd':
            cdCommand(args);
            break;
          case 'ls':
            lsCommand();
            break;
          case 'cat':
            catCommand(args);
            break;
          case 'clear':
            terminal.clear();
            break;
          default:
            terminal.writeln(`\r\nCommand not found: ${cmd}`);
        }
      };

      //ls cmd
      const lsCommand = () => {
        const currDir = getCurrDir();
      
        if (currDir && currDir.contents && typeof currDir.contents === 'object') {
          const entries = Object.keys(currDir.contents);
          terminal.writeln('\r\n' + entries.join('\r\n'));
        } else {
          terminal.writeln('\r\nCannot list contents: invalid directory.');
        }
      };
      
      //cat cmd
      const catCommand = (args) => {
        if (args.length === 0) {
          terminal.writeln("\r\nNo file selected.");
          return;
        }

        const fileName = args[0];
        const currDir = getCurrDir();

        if (currDir && currDir.contents && currDir.contents[fileName]) {
          const file = currDir.contents[fileName];
          if (file.type === 'file') {
            terminal.writeln(`\r\n${file.content}`);
          } else {
            terminal.writeln(`\r\n${fileName} is not a file.`);
          }
        } else {
          terminal.writeln(`\r\nFile not found: ${fileName}`);
        }
      };

      //cd cmd
      const cdCommand = (args) => {
        if (args.length === 0) {
          terminal.writeln("\r\nNo directory given.");
          return;
        }
      
        const dirName = args[0];
      
        if (dirName === '..') {
          if (currPath.length > 0) {
            setCurrPath(prev => prev.slice(0, -1));
          } else {
            terminal.writeln("\r\nAlready at root directory!");
          }
          return;
        }
      
        const currDir = getCurrDir();
      
        if (currDir && currDir.contents) {
          if (currDir.contents[dirName] && currDir.contents[dirName].type === 'directory') {
            setCurrPath(prev => [...prev, dirName]);
          } else {
            terminal.writeln(`\r\nDirectory not found or not a directory: ${dirName}`);
          }
        } else {
          terminal.writeln(`\r\nInvalid directory: ${dirName}`);
        }
      };
            
      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);

      return () => {
        terminal.dispose();
        window.removeEventListener('resize', fitAddon.fit);
      };
    }
  }, [getCurrDir, currPath]);

  return (
    <div ref={terminalRef} style={{ width: '100%', height: '100vh' }}></div>
  );
}

export default App;
