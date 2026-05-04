import numpy as np
from scipy.io import wavfile
import os

def generate_tone(frequency, duration, sample_rate=44100, volume=0.5):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    # Generate a sine wave
    tone = np.sin(frequency * t * 2 * np.pi)
    # Apply an envelope to avoid clicks
    envelope = np.ones_like(t)
    fade_len = int(sample_rate * 0.1)
    if len(envelope) > 2 * fade_len:
        envelope[:fade_len] = np.linspace(0, 1, fade_len)
        envelope[-fade_len:] = np.linspace(1, 0, fade_len)
    
    # Scale to 16-bit integer
    audio = tone * envelope * volume * 32767
    return audio.astype(np.int16)

def generate_chord(frequencies, duration, sample_rate=44100, volume=0.5):
    chord = np.zeros(int(sample_rate * duration))
    for f in frequencies:
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        chord += np.sin(f * t * 2 * np.pi)
    chord = chord / len(frequencies)
    
    envelope = np.ones_like(chord)
    fade_len = int(sample_rate * 0.1)
    if len(envelope) > 2 * fade_len:
        envelope[:fade_len] = np.linspace(0, 1, fade_len)
        envelope[-fade_len:] = np.linspace(1, 0, fade_len)
        
    audio = chord * envelope * volume * 32767
    return audio.astype(np.int16)

def main():
    os.makedirs("bgm_library", exist_ok=True)
    
    # Happy: C Major chord (C4, E4, G4)
    print("Generating happy BGM...")
    happy_audio = generate_chord([261.63, 329.63, 392.00], duration=60.0)
    wavfile.write("bgm_library/happy.wav", 44100, happy_audio)
    
    # Sad: A Minor chord (A3, C4, E4)
    print("Generating sad BGM...")
    sad_audio = generate_chord([220.00, 261.63, 329.63], duration=60.0)
    wavfile.write("bgm_library/sad.wav", 44100, sad_audio)
    
    # Tense: Tritone / Dissonant (C4, F#4)
    print("Generating tense BGM...")
    tense_audio = generate_chord([261.63, 369.99], duration=60.0)
    wavfile.write("bgm_library/tense.wav", 44100, tense_audio)
    
    # Calm: Soft low pad (C3, G3)
    print("Generating calm BGM...")
    calm_audio = generate_chord([130.81, 196.00], duration=60.0, volume=0.3)
    wavfile.write("bgm_library/calm.wav", 44100, calm_audio)

if __name__ == "__main__":
    main()
