-- AppleScript to run keyboard shortcuts test in Chrome
tell application "Google Chrome"
	activate
	
	-- Wait for page to load
	delay 3
	
	-- Get the test script content
	set testScript to "
	// Inject the test suite
	fetch('/browser-keyboard-test-suite.js')
		.then(response => response.text())
		.then(script => {
			eval(script);
		})
		.catch(error => {
			console.error('Failed to load test script:', error);
			console.log('Running fallback test...');
			
			// Fallback basic test
			console.log('🚀 Running Basic Keyboard Shortcuts Test...');
			
			let passed = 0, failed = 0;
			
			function test(name, condition, message) {
				if (condition) {
					passed++;
					console.log(`✅ ${name}: ${message}`);
				} else {
					failed++;
					console.log(`❌ ${name}: ${message}`);
				}
			}
			
			// Basic tests
			const helpBefore = document.querySelector('[role=\"dialog\"]');
			document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
			setTimeout(() => {
				const helpAfter = document.querySelector('[role=\"dialog\"]');
				test('Help Modal', !helpBefore && !!helpAfter, helpAfter ? 'Opened successfully' : 'Not found');
				
				if (helpAfter) {
					document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
				}
				
				setTimeout(() => {
					document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
					setTimeout(() => {
						const commandPalette = document.querySelector('[role=\"dialog\"] input');
						test('Command Palette', !!commandPalette, commandPalette ? 'Opened successfully' : 'Not found');
						
						const tasks = document.querySelectorAll('[data-task-id]');
						test('Tasks Available', tasks.length > 0, `Found ${tasks.length} tasks`);
						
						document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
						setTimeout(() => {
							const selected = document.querySelector('[data-selected=\"true\"]');
							test('Task Selection', !!selected, selected ? 'Task selected' : 'No selection');
							
							console.log(`\\n📊 Quick Test Results: ${passed} passed, ${failed} failed`);
							console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
							
							if (passed >= 3) {
								console.log('🎉 BASIC PASS - Core functionality working');
							} else {
								console.log('❌ BASIC FAIL - Issues detected');
							}
						}, 300);
					}, 300);
				}, 300);
			}, 500);
		});
	"
	
	-- Execute the test script
	tell active tab of first window
		execute javascript testScript
	end tell
	
end tell