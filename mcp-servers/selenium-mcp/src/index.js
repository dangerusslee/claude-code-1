#!/usr/bin/env node

/**
 * Consolidated Selenium MCP Server with Undetected Chrome Support
 * Combines proven manual stealth with optional undetected-chromedriver-js
 * Version: 2.0.0
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// Optional undetected chromedriver support
let UndetectedChrome = null;
try {
    UndetectedChrome = require('undetected-chromedriver-js');
} catch (error) {
    // Gracefully fall back to manual stealth if not available
}

class SeleniumMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'selenium-mcp-server',
                version: '2.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );
        
        this.driver = null;
        this.undetectedInstance = null;
        this.setupToolHandlers();
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'selenium_navigate',
                        description: 'Navigate to a URL with advanced anti-detection',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                url: {
                                    type: 'string',
                                    description: 'URL to navigate to'
                                },
                                wait_for: {
                                    type: 'string',
                                    description: 'CSS selector to wait for (optional)'
                                },
                                stealth_mode: {
                                    type: 'boolean',
                                    description: 'Enable maximum stealth features',
                                    default: true
                                },
                                headless: {
                                    type: 'boolean',
                                    description: 'Run in headless mode',
                                    default: false
                                },
                                user_agent: {
                                    type: 'string',
                                    description: 'Custom user agent (optional)'
                                },
                                use_undetected: {
                                    type: 'boolean',
                                    description: 'Try to use undetected-chromedriver if available',
                                    default: true
                                }
                            },
                            required: ['url']
                        }
                    },
                    {
                        name: 'selenium_extract_text',
                        description: 'Extract text content from elements',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                selector: {
                                    type: 'string',
                                    description: 'CSS selector to find elements'
                                },
                                attribute: {
                                    type: 'string',
                                    description: 'Attribute to extract (optional, defaults to text content)'
                                },
                                multiple: {
                                    type: 'boolean',
                                    description: 'Extract from multiple elements',
                                    default: true
                                }
                            },
                            required: ['selector']
                        }
                    },
                    {
                        name: 'selenium_click',
                        description: 'Click on an element with human-like behavior',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                selector: {
                                    type: 'string',
                                    description: 'CSS selector of element to click'
                                },
                                wait_time: {
                                    type: 'number',
                                    description: 'Time to wait after click (ms)',
                                    default: 1000
                                },
                                human_like: {
                                    type: 'boolean',
                                    description: 'Use human-like click patterns',
                                    default: true
                                }
                            },
                            required: ['selector']
                        }
                    },
                    {
                        name: 'selenium_type',
                        description: 'Type text into an input field with realistic timing',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                selector: {
                                    type: 'string',
                                    description: 'CSS selector of input element'
                                },
                                text: {
                                    type: 'string',
                                    description: 'Text to type'
                                },
                                human_typing: {
                                    type: 'boolean',
                                    description: 'Simulate human typing speed',
                                    default: true
                                },
                                clear_first: {
                                    type: 'boolean',
                                    description: 'Clear field before typing',
                                    default: true
                                }
                            },
                            required: ['selector', 'text']
                        }
                    },
                    {
                        name: 'selenium_screenshot',
                        description: 'Take a screenshot',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                filename: {
                                    type: 'string',
                                    description: 'Filename for screenshot (optional)'
                                },
                                element_selector: {
                                    type: 'string',
                                    description: 'CSS selector to screenshot specific element (optional)'
                                },
                                full_page: {
                                    type: 'boolean',
                                    description: 'Take full page screenshot',
                                    default: false
                                }
                            }
                        }
                    },
                    {
                        name: 'selenium_scroll',
                        description: 'Scroll the page with natural movement',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                direction: {
                                    type: 'string',
                                    enum: ['up', 'down', 'left', 'right'],
                                    description: 'Scroll direction'
                                },
                                amount: {
                                    type: 'number',
                                    description: 'Scroll amount in pixels',
                                    default: 500
                                },
                                smooth: {
                                    type: 'boolean',
                                    description: 'Use smooth scrolling',
                                    default: true
                                }
                            },
                            required: ['direction']
                        }
                    },
                    {
                        name: 'selenium_bypass_cloudflare',
                        description: 'Navigate and wait for Cloudflare challenge completion',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                url: {
                                    type: 'string',
                                    description: 'URL to access'
                                },
                                max_wait: {
                                    type: 'number',
                                    description: 'Maximum wait time for bypass (seconds)',
                                    default: 30
                                }
                            },
                            required: ['url']
                        }
                    },
                    {
                        name: 'selenium_get_status',
                        description: 'Get current browser status and capabilities',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'selenium_close',
                        description: 'Close the browser session',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                switch (name) {
                    case 'selenium_navigate':
                        return await this.navigate(args);
                    case 'selenium_extract_text':
                        return await this.extractText(args);
                    case 'selenium_click':
                        return await this.click(args);
                    case 'selenium_type':
                        return await this.type(args);
                    case 'selenium_screenshot':
                        return await this.screenshot(args);
                    case 'selenium_scroll':
                        return await this.scroll(args);
                    case 'selenium_bypass_cloudflare':
                        return await this.bypassCloudflare(args);
                    case 'selenium_get_status':
                        return await this.getStatus(args);
                    case 'selenium_close':
                        return await this.close(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`
                        }
                    ]
                };
            }
        });
    }

    async initDriver(stealthMode = true, headless = false, userAgent = null, useUndetected = true) {
        if (this.driver) {
            return this.driver;
        }

        // Try undetected chrome first if available and requested
        if (UndetectedChrome && useUndetected) {
            try {
                console.error('Attempting to use undetected-chromedriver-js...');
                
                const options = {
                    headless: headless,
                    userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    windowSize: { width: 1920, height: 1080 },
                    arguments: []
                };

                this.undetectedInstance = new UndetectedChrome(options);
                this.driver = await this.undetectedInstance.build();
                console.error('✅ Undetected chromedriver initialized successfully');
                return this.driver;
            } catch (error) {
                console.error('⚠️ Undetected chromedriver failed, falling back to manual stealth:', error.message);
            }
        }

        // Fall back to proven manual stealth mode
        return await this.initStealthDriver(stealthMode, headless, userAgent);
    }

    async initStealthDriver(stealthMode = true, headless = false, userAgent = null) {
        console.error('🛡️ Initializing with proven manual stealth features...');
        
        const options = new chrome.Options();
        
        if (stealthMode) {
            // Comprehensive anti-detection arguments
            const stealthArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--metrics-recording-only',
                '--mute-audio',
                '--safebrowsing-disable-auto-update',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-domain-reliability',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees,VizDisplayCompositor',
                '--disable-ipc-flooding-protection',
                '--disable-renderer-backgrounding',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-component-extensions-with-background-pages',
                '--disable-web-security',
                '--disable-blink-features=AutomationControlled'
            ];

            options.addArguments(stealthArgs);

            // Realistic user agent
            const defaultUA = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            options.addArguments(`--user-agent=${defaultUA}`);

            // Anti-detection preferences  
            options.setUserPreferences({
                'profile.default_content_setting_values.notifications': 2,
                'profile.default_content_settings.popups': 0,
                'profile.managed_default_content_settings.images': 1,
            });

            // Experimental options for stealth
            options.setExperimentalOption('excludeSwitches', ['enable-automation']);
            options.setExperimentalOption('useAutomationExtension', false);
        }

        if (headless) {
            options.addArguments('--headless=new');
        }

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        // Execute comprehensive stealth JavaScript
        if (stealthMode) {
            await this.executeStealthScript();
        }

        console.error('✅ Manual stealth driver initialized successfully');
        return this.driver;
    }

    async executeStealthScript() {
        try {
            await this.driver.executeScript(`
                // Comprehensive stealth script - remove all webdriver traces
                
                // Override webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                // Override chrome runtime
                window.chrome = {
                    runtime: {},
                };
                
                // Override permissions API
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
                
                // Override plugins with realistic values
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer'},
                        {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'},
                        {name: 'Native Client', filename: 'internal-nacl-plugin'}
                    ],
                });

                // Override languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });

                // Override webGL with realistic values
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) {
                        return 'Intel Inc.';
                    }
                    if (parameter === 37446) {
                        return 'Intel Iris OpenGL Engine';
                    }
                    return getParameter.call(this, parameter);
                };

                // Override getContext
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, attributes) {
                    if (type === 'webgl' || type === 'webgl2') {
                        attributes = attributes || {};
                        attributes.failIfMajorPerformanceCaveat = false;
                    }
                    return originalGetContext.call(this, type, attributes);
                };

                // Remove automation indicators
                const automationProps = [
                    '__webdriver_script_fn',
                    '__selenium_unwrapped',
                    '__webdriver_unwrapped',
                    '__driver_evaluate',
                    '__webdriver_evaluate',
                    '__selenium_evaluate',
                    '__fxdriver_evaluate',
                    '__driver_unwrapped',
                    '__fxdriver_unwrapped',
                    '__webdriver_script_func',
                    '__webdriver_script_function'
                ];
                
                automationProps.forEach(prop => {
                    delete navigator[prop];
                    delete window[prop];
                });

                // Override toString methods
                if (navigator.webdriver !== undefined) {
                    Object.defineProperty(navigator.webdriver, 'toString', {
                        value: () => 'undefined'
                    });
                }

                // Mock realistic screen properties
                Object.defineProperty(screen, 'availHeight', {get: () => 1040});
                Object.defineProperty(screen, 'availWidth', {get: () => 1920});
                Object.defineProperty(screen, 'height', {get: () => 1080});
                Object.defineProperty(screen, 'width', {get: () => 1920});
                Object.defineProperty(screen, 'colorDepth', {get: () => 24});
                Object.defineProperty(screen, 'pixelDepth', {get: () => 24});
            `);
            console.error('✅ Comprehensive stealth script executed');
        } catch (error) {
            console.error('⚠️ Failed to execute stealth script:', error.message);
        }
    }

    async navigate(args) {
        const driver = await this.initDriver(
            args.stealth_mode !== false, 
            args.headless || false, 
            args.user_agent,
            args.use_undetected !== false
        );
        
        try {
            await driver.get(args.url);
            
            if (args.wait_for) {
                await driver.wait(until.elementLocated(By.css(args.wait_for)), 10000);
            }
            
            const title = await driver.getTitle();
            const currentUrl = await driver.getCurrentUrl();
            const method = this.undetectedInstance ? 'Undetected ChromeDriver' : 'Manual Stealth';
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Successfully navigated to: ${currentUrl}\n📄 Page title: ${title}\n🛡️ Method: ${method}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Navigation failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async extractText(args) {
        if (!this.driver) {
            throw new Error('Browser not initialized. Navigate to a page first.');
        }

        try {
            const elements = await this.driver.findElements(By.css(args.selector));
            const results = [];
            
            const elementsToProcess = args.multiple !== false ? elements : elements.slice(0, 1);
            
            for (const element of elementsToProcess) {
                let value;
                if (args.attribute) {
                    value = await element.getAttribute(args.attribute);
                } else {
                    value = await element.getText();
                }
                results.push(value);
            }
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `📝 Extracted ${results.length} elements:\n${results.join('\n')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Extraction failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async click(args) {
        if (!this.driver) {
            throw new Error('Browser not initialized. Navigate to a page first.');
        }

        try {
            const element = await this.driver.findElement(By.css(args.selector));
            
            if (args.human_like !== false) {
                // Add random delay to simulate human behavior
                await this.driver.sleep(50 + Math.random() * 100);
            }
            
            await element.click();
            
            if (args.wait_time) {
                await this.driver.sleep(args.wait_time);
            }
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `🖱️ Clicked element: ${args.selector}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Click failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async type(args) {
        if (!this.driver) {
            throw new Error('Browser not initialized. Navigate to a page first.');
        }

        try {
            const element = await this.driver.findElement(By.css(args.selector));
            
            if (args.clear_first !== false) {
                await element.clear();
            }
            
            if (args.human_typing !== false) {
                // Type with realistic human delays
                for (const char of args.text) {
                    await element.sendKeys(char);
                    await this.driver.sleep(50 + Math.random() * 100);
                }
            } else {
                await element.sendKeys(args.text);
            }
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `⌨️ Typed text into element: ${args.selector}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Typing failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async screenshot(args) {
        if (!this.driver) {
            throw new Error('Browser not initialized. Navigate to a page first.');
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = args.filename || `screenshot-${timestamp}.png`;
            const filepath = path.join('/tmp', filename);
            
            let screenshot;
            if (args.element_selector) {
                const element = await this.driver.findElement(By.css(args.element_selector));
                screenshot = await element.takeScreenshot();
            } else if (args.full_page) {
                const originalSize = await this.driver.manage().window().getSize();
                const bodyHeight = await this.driver.executeScript('return document.body.scrollHeight');
                await this.driver.manage().window().setSize(originalSize.width, bodyHeight);
                screenshot = await this.driver.takeScreenshot();
                await this.driver.manage().window().setSize(originalSize.width, originalSize.height);
            } else {
                screenshot = await this.driver.takeScreenshot();
            }
            
            fs.writeFileSync(filepath, screenshot, 'base64');
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `📸 Screenshot saved to: ${filepath}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Screenshot failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async scroll(args) {
        if (!this.driver) {
            throw new Error('Browser not initialized. Navigate to a page first.');
        }

        try {
            const amount = args.amount || 500;
            let script;
            
            if (args.smooth !== false) {
                // Smooth scrolling
                const scrollScripts = {
                    'down': `window.scrollBy({top: ${amount}, behavior: 'smooth'})`,
                    'up': `window.scrollBy({top: -${amount}, behavior: 'smooth'})`,
                    'right': `window.scrollBy({left: ${amount}, behavior: 'smooth'})`,
                    'left': `window.scrollBy({left: -${amount}, behavior: 'smooth'})`
                };
                script = scrollScripts[args.direction];
            } else {
                // Instant scrolling
                const scrollScripts = {
                    'down': `window.scrollBy(0, ${amount})`,
                    'up': `window.scrollBy(0, -${amount})`,
                    'right': `window.scrollBy(${amount}, 0)`,
                    'left': `window.scrollBy(-${amount}, 0)`
                };
                script = scrollScripts[args.direction];
            }
            
            await this.driver.executeScript(script);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `📜 Scrolled ${args.direction} by ${amount} pixels`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Scroll failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async bypassCloudflare(args) {
        if (!this.driver) {
            await this.initDriver(true, false, null, true);
        }

        try {
            await this.driver.get(args.url);
            
            const maxWait = (args.max_wait || 30) * 1000;
            const startTime = Date.now();
            
            console.error('🛡️ Attempting Cloudflare bypass...');
            
            while (Date.now() - startTime < maxWait) {
                const currentUrl = await this.driver.getCurrentUrl();
                const pageSource = await this.driver.getPageSource();
                
                const cloudflareIndicators = [
                    'cloudflare',
                    'checking your browser',
                    'ddos protection',
                    'ray id',
                    'cf-ray'
                ];
                
                const hasCloudflare = cloudflareIndicators.some(indicator => 
                    currentUrl.toLowerCase().includes(indicator) || 
                    pageSource.toLowerCase().includes(indicator)
                );
                
                if (!hasCloudflare) {
                    break;
                }
                
                await this.driver.sleep(2000);
            }
            
            const finalUrl = await this.driver.getCurrentUrl();
            const title = await this.driver.getTitle();
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `🛡️ Cloudflare bypass completed.\n🌐 Final URL: ${finalUrl}\n📄 Title: ${title}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Cloudflare bypass failed: ${error.message}`
                    }
                ]
            };
        }
    }

    async getStatus() {
        const status = {
            driverInitialized: !!this.driver,
            stealthMethod: this.undetectedInstance ? 'Undetected ChromeDriver' : 'Manual Stealth',
            undetectedAvailable: !!UndetectedChrome,
            capabilities: [
                'Advanced anti-detection',
                'Human-like interactions', 
                'Cloudflare bypass',
                'Screenshot capture',
                'Text extraction'
            ]
        };

        if (this.driver) {
            try {
                status.currentUrl = await this.driver.getCurrentUrl();
                status.title = await this.driver.getTitle();
            } catch (error) {
                status.error = error.message;
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `🔍 Browser Status:\n${JSON.stringify(status, null, 2)}`
                }
            ]
        };
    }

    async close() {
        if (this.undetectedInstance) {
            await this.undetectedInstance.quit();
            this.undetectedInstance = null;
            this.driver = null;
        } else if (this.driver) {
            await this.driver.quit();
            this.driver = null;
        }
        
        return {
            content: [
                {
                    type: 'text',
                    text: '🔒 Browser session closed'
                }
            ]
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        const method = UndetectedChrome ? 'with undetected-chromedriver-js support' : 'with manual stealth only';
        console.error(`🚀 Selenium MCP Server v2.0.0 running ${method}`);
    }
}

// Start the server
const server = new SeleniumMCPServer();
server.run().catch(console.error);