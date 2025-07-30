/**
 * TTS Manager - Enhanced Text-to-Speech with Multiple Fallbacks
 * File: tts/static/tts/js/tts-manager.js
 */

class TTSManager {
    constructor() {
        this.primaryEndpoint = '/api/tts/';
        this.fallbackEndpoints = [
            '/api/tts/pyttsx3/',
            '/api/tts/edge/',
            '/api/tts/fallback/'
        ];
        this.currentAudio = null;
        this.isPlaying = false;
        this.retryCount = 0;
        this.maxRetries = 2;
        this.statusChecked = false;
        this.availableMethods = [];
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // Initialize TTS Manager
    async initialize() {
        console.log('🎤 TTS Manager initialized');
        
        // Check TTS status
        await this.checkTTSStatus();
        
        // Initialize TTS buttons
        this.initializeTTSButtons();
        
        // Load voices for browser TTS
        if ('speechSynthesis' in window) {
            speechSynthesis.getVoices();
            speechSynthesis.onvoiceschanged = () => {
                console.log('🔊 TTS voices loaded:', speechSynthesis.getVoices().length);
            };
        }
        
        // Add global error handler
        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('tts-manager')) {
                console.error('TTS Manager Error:', event.error);
            }
        });
    }

    // Check TTS status from server
    async checkTTSStatus() {
        try {
            const response = await fetch('/api/tts/status/');
            if (response.ok) {
                const status = await response.json();
                this.availableMethods = status.available_methods || [];
                console.log('📊 Available TTS methods:', this.availableMethods);
                
                // Update UI based on available methods
                this.updateTTSButtonStates();
            }
        } catch (error) {
            console.warn('⚠️ Could not check TTS status:', error);
            this.availableMethods = ['browser']; // Fallback to browser TTS
        }
        this.statusChecked = true;
    }

    // Main TTS function with fallback chain
    async speakText(text, options = {}) {
        if (!text || text.trim() === '') {
            console.warn('⚠️ No text provided for TTS');
            return false;
        }

        // Stop any currently playing audio
        this.stopCurrentAudio();

        // Clean and limit text
        text = this.cleanText(text);
        
        console.log(`🎯 Attempting TTS for: "${text.substring(0, 50)}..."`);

        // Show loading indicator if element exists
        this.showTTSLoading(true);

        try {
            // Try server endpoints first, then browser fallback
            const endpoints = [this.primaryEndpoint, ...this.fallbackEndpoints];
            
            for (let i = 0; i < endpoints.length; i++) {
                try {
                    const success = await this.tryTTSEndpoint(endpoints[i], text, options);
                    if (success) {
                        console.log(`✅ TTS successful using endpoint: ${endpoints[i]}`);
                        return true;
                    }
                } catch (error) {
                    console.warn(`❌ TTS failed for endpoint ${endpoints[i]}:`, error);
                }
            }

            // If all server endpoints fail, try browser TTS
            console.log('🌐 All server TTS options failed, trying browser TTS');
            return this.speakWithBrowserTTS(text, options);
            
        } finally {
            this.showTTSLoading(false);
        }
    }

    // Try a specific TTS endpoint
    async tryTTSEndpoint(endpoint, text, options = {}) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, ...options }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                // Handle JSON response (might be fallback instruction)
                const data = await response.json();
                if (data.use_browser_tts) {
                    return this.speakWithBrowserTTS(data.text, options);
                }
                throw new Error(data.error || 'Unknown error');
            } else {
                // Handle audio response
                const audioBlob = await response.blob();
                await this.playAudioBlob(audioBlob);
                return true;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }

    // Play audio blob
    async playAudioBlob(audioBlob) {
        return new Promise((resolve, reject) => {
            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudio = new Audio(audioUrl);
            
            this.currentAudio.oncanplaythrough = () => {
                this.isPlaying = true;
                this.currentAudio.play().catch(reject);
            };
            
            this.currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.isPlaying = false;
                resolve(true);
            };
            
            this.currentAudio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                this.isPlaying = false;
                reject(new Error('Audio playback failed'));
            };
            
            // Load the audio
            this.currentAudio.load();
        });
    }

    // Browser-based TTS fallback
    speakWithBrowserTTS(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                console.error('❌ Browser TTS not supported');
                this.showTTSError('Text-to-speech is not supported in your browser');
                reject(new Error('Browser TTS not supported'));
                return;
            }

            // Cancel any ongoing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure speech parameters
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 0.8;
            utterance.lang = options.lang || 'en-US';

            // Try to use a better voice
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0 && !options.voice) {
                const preferredVoice = this.selectBestVoice(voices, options.lang);
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }
            } else if (options.voice) {
                const selectedVoice = voices.find(voice => voice.name === options.voice);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }

            // Event handlers
            utterance.onstart = () => {
                this.isPlaying = true;
                console.log('🌐 Browser TTS started');
            };

            utterance.onend = () => {
                this.isPlaying = false;
                console.log('✅ Browser TTS completed');
                resolve(true);
            };

            utterance.onerror = (event) => {
                this.isPlaying = false;
                console.error('❌ Browser TTS error:', event);
                this.showTTSError('Speech synthesis failed');
                reject(new Error('Browser TTS failed'));
            };

            // Speak the text
            speechSynthesis.speak(utterance);
        });
    }

    // Select the best available voice
    selectBestVoice(voices, lang = 'en-US') {
        // Prefer voices in the specified language
        const langVoices = voices.filter(voice => voice.lang.startsWith(lang.split('-')[0]));
        
        if (langVoices.length === 0) {
            return voices[0]; // Fallback to first available voice
        }

        // Prefer certain voice names (more natural sounding)
        const preferredNames = [
            'Aria', 'Jenny', 'Guy', 'Zira', 'David', 'Mark',
            'Samantha', 'Susan', 'Alex', 'Karen', 'Moira'
        ];

        for (const name of preferredNames) {
            const voice = langVoices.find(v => v.name.includes(name));
            if (voice) return voice;
        }

        // Prefer female voices
        const femaleVoice = langVoices.find(voice => 
            voice.name.toLowerCase().includes('female') ||
            voice.name.toLowerCase().includes('woman')
        );
        if (femaleVoice) return femaleVoice;

        // Return first voice in preferred language
        return langVoices[0];
    }

    // Clean and prepare text for TTS
    cleanText(text) {
        // Remove HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Replace common symbols with readable text
        text = text.replace(/&/g, ' and ');
        text = text.replace(/@/g, ' at ');
        text = text.replace(/\$/g, ' dollars ');
        text = text.replace(/%/g, ' percent ');
        text = text.replace(/=/g, ' equals ');
        text = text.replace(/\+/g, ' plus ');
        text = text.replace(/-/g, ' minus ');
        text = text.replace(/\*/g, ' times ');
        text = text.replace(/\//g, ' divided by ');
        
        // Replace numbers with more readable format
        text = text.replace(/(\d)\.(\d)/g, '$1 point $2');
        
        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // Limit length
        if (text.length > 500) {
            text = text.substring(0, 497) + '...';
            console.warn('⚠️ Text truncated for TTS');
        }
        
        return text;
    }

    // Stop any currently playing audio
    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        this.isPlaying = false;
    }

    // Initialize TTS buttons
    initializeTTSButtons() {
        // Add click handlers to all TTS buttons
        document.querySelectorAll('.tts-button, [data-tts], [onclick*="speak"]').forEach(button => {
            // Remove existing onclick handlers to avoid conflicts
            button.removeAttribute('onclick');
            
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                
                // Get text from various sources
                let text = this.getTextForButton(button);
                
                if (text) {
                    // Visual feedback
                    this.setButtonState(button, 'loading');
                    
                    try {
                        await this.speakText(text);
                        this.setButtonState(button, 'success');
                    } catch (error) {
                        this.setButtonState(button, 'error');
                        console.error('TTS failed:', error);
                    }
                    
                    // Reset button state after delay
                    setTimeout(() => {
                        this.setButtonState(button, 'default');
                    }, 2000);
                }
            });
        });
    }

    // Get text for a TTS button
    getTextForButton(button) {
        // Check data attributes
        let text = button.dataset.tts;
        if (text) return text;
        
        // Check for target selector
        const targetSelector = button.dataset.ttsTarget;
        if (targetSelector) {
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
                return targetElement.textContent || targetElement.innerText;
            }
        }
        
        // Check common question text elements
        const questionText = document.getElementById('questionText');
        if (questionText) {
            return questionText.textContent || questionText.innerText;
        }
        
        // Check for nearby text content
        const parent = button.closest('.question-container, .card, .content');
        if (parent) {
            const textElement = parent.querySelector('.question-text, .text, p, span');
            if (textElement) {
                return textElement.textContent || textElement.innerText;
            }
        }
        
        return null;
    }

    // Set button visual state
    setButtonState(button, state) {
        button.classList.remove('tts-loading', 'tts-success', 'tts-error');
        
        switch (state) {
            case 'loading':
                button.classList.add('tts-loading');
                button.disabled = true;
                break;
            case 'success':
                button.classList.add('tts-success');
                button.disabled = false;
                break;
            case 'error':
                button.classList.add('tts-error');
                button.disabled = false;
                break;
            default:
                button.disabled = false;
        }
    }

    // Update TTS button states based on available methods
    updateTTSButtonStates() {
        const buttons = document.querySelectorAll('.tts-button, [data-tts]');
        buttons.forEach(button => {
            if (this.availableMethods.length === 0) {
                button.disabled = true;
                button.title = 'TTS not available';
            } else {
                button.disabled = false;
                button.title = `Available: ${this.availableMethods.join(', ')}`;
            }
        });
    }

    // Show/hide loading indicator
    showTTSLoading(show) {
        const indicator = document.getElementById('ttsLoadingIndicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    // Show TTS error to user
    showTTSError(message) {
        console.error('❌ TTS Error:', message);
        
        // Try to show in UI
        const errorContainer = document.getElementById('ttsErrorContainer');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        }
        
        // Fallback: show as toast or alert
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            // Don't show alert unless in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                alert(`TTS Error: ${message}`);
            }
        }
    }

    // Check if TTS is currently playing
    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    // Get available TTS methods
    getAvailableMethods() {
        return this.availableMethods;
    }

    // Set TTS options globally
    setDefaultOptions(options) {
        this.defaultOptions = { ...options };
    }
}

// Create global TTS manager instance
const ttsManager = new TTSManager();

// Legacy functions for backward compatibility
async function speakText(text, options = {}) {
    return await ttsManager.speakText(text, options);
}

function speakQuestion() {
    const questionText = document.getElementById('questionText')?.textContent;
    if (questionText) {
        return ttsManager.speakText(questionText);
    }
    return Promise.resolve(false);
}

// Auto-speak functionality
let autoSpeakEnabled = false;

function toggleAutoSpeak() {
    autoSpeakEnabled = !autoSpeakEnabled;
    console.log('🔄 Auto-speak:', autoSpeakEnabled ? 'enabled' : 'disabled');
    
    // Update UI if toggle button exists
    const toggleButton = document.getElementById('autoSpeakToggle');
    if (toggleButton) {
        toggleButton.textContent = autoSpeakEnabled ? '🔊 Auto-Speak: ON' : '🔇 Auto-Speak: OFF';
        toggleButton.classList.toggle('active', autoSpeakEnabled);
    }
}

function autoSpeakContent(selector) {
    if (!autoSpeakEnabled) return;
    
    const element = document.querySelector(selector);
    if (element && element.textContent) {
        setTimeout(() => {
            ttsManager.speakText(element.textContent);
        }, 500);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TTSManager, ttsManager, speakText, speakQuestion };
}