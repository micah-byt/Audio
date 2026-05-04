import numpy as np
from scipy.io import wavfile
import os

def generate_noise(duration, sample_rate=44100, volume=0.5):
    noise = np.random.uniform(-1, 1, int(sample_rate * duration))
    # Apply envelope for percussive sound
    envelope = np.exp(-10 * np.linspace(0, duration, int(sample_rate * duration)))
    audio = noise * envelope * volume * 32767
    return audio.astype(np.int16)

def generate_clap(sample_rate=44100):
    # A burst of noise to simulate a clap
    noise = np.random.uniform(-1, 1, int(sample_rate * 0.1))
    envelope = np.exp(-30 * np.linspace(0, 0.1, int(sample_rate * 0.1)))
    audio = noise * envelope * 0.5 * 32767
    return audio.astype(np.int16)

def main():
    os.makedirs("bgm_library", exist_ok=True)
    
    print("Generating boom SFX...")
    boom_audio = generate_noise(1.5, volume=0.8)
    wavfile.write("bgm_library/boom.wav", 44100, boom_audio)
    
    print("Generating clap SFX...")
    clap_audio = generate_clap()
    wavfile.write("bgm_library/clap.wav", 44100, clap_audio)
    
    print("Generating laugh SFX (placeholder tone)...")
    # Sine wave sequence to simulate laugh
    t = np.linspace(0, 0.5, int(44100 * 0.5), False)
    laugh = np.sin(440 * t * 2 * np.pi) * np.sin(10 * t * 2 * np.pi) * 0.5 * 32767
    wavfile.write("bgm_library/laugh.wav", 44100, laugh.astype(np.int16))

if __name__ == "__main__":
    main()
