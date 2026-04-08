#!/usr/bin/env python3
"""
Tone analysis module for extracting audio metrics from video/audio files.
Computes RMS, pitch, and stability score compatible with frontend DSP.
"""

import sys
import json
import subprocess
import tempfile
import os
from pathlib import Path
import wave
import struct
import math

def get_audio_from_file(file_path):
    """Extract audio from video/audio file using ffmpeg, return PCM data."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp_path = tmp.name
        
        # Extract audio: mono, 16-bit, 16kHz
        subprocess.run([
            'ffmpeg',
            '-y',
            '-i', file_path,
            '-ac', '1',
            '-ar', '16000',
            '-acodec', 'pcm_s16le',
            tmp_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Read WAV file
        with wave.open(tmp_path, 'rb') as wav:
            frames = wav.readframes(wav.getnframes())
        
        # Convert bytes to float samples
        samples = struct.unpack(f'<{len(frames)//2}h', frames)
        pcm_data = [s / 32768.0 for s in samples]
        
        os.unlink(tmp_path)
        return pcm_data
    except Exception as e:
        raise RuntimeError(f"Failed to extract audio: {str(e)}")

def calculate_rms(samples):
    """Calculate RMS (root mean square) loudness."""
    if not samples:
        return 0.0
    mean_square = sum(s ** 2 for s in samples) / len(samples)
    return math.sqrt(mean_square)

def detect_pitch_autocorr(samples, sample_rate=16000):
    """Detect pitch using autocorrelation method."""
    min_hz = 70
    max_hz = 300
    min_lag = int(sample_rate / max_hz)
    max_lag = int(sample_rate / min_hz)
    
    if len(samples) < max_lag + 1:
        return 0.0
    
    # Apply Hann window
    window = [0.5 - 0.5 * math.cos(2 * math.pi * i / len(samples)) 
              for i in range(len(samples))]
    windowed = [samples[i] * window[i] for i in range(len(samples))]
    
    # Compute autocorrelation
    best_lag = -1
    best_corr = 0.0
    
    for lag in range(min_lag, max_lag + 1):
        corr = sum(windowed[i] * windowed[i + lag] 
                   for i in range(len(windowed) - lag))
        if corr > best_corr:
            best_corr = corr
            best_lag = lag
    
    # Signal energy check
    energy = sum(s ** 2 for s in windowed)
    if best_lag <= 0 or energy <= 0:
        return 0.0
    
    normalized_corr = best_corr / energy
    if normalized_corr < 0.1:
        return 0.0
    
    return sample_rate / best_lag

def analyze_tone(pcm_data, sample_rate=16000, chunk_duration_ms=200):
    """Analyze tone metrics from PCM audio data."""
    chunk_size = int(sample_rate * chunk_duration_ms / 1000)
    
    rms_samples = []
    pitch_samples = []
    
    # Process audio in chunks
    for i in range(0, len(pcm_data), chunk_size):
        chunk = pcm_data[i:i + chunk_size]
        if len(chunk) < chunk_size // 2:
            break
        
        rms = calculate_rms(chunk)
        rms_samples.append(rms)
        
        pitch = detect_pitch_autocorr(chunk, sample_rate)
        if pitch > 0:
            pitch_samples.append(pitch)
    
    if not rms_samples:
        return None
    
    # Compute statistics
    avg_rms = sum(rms_samples) / len(rms_samples)
    peak_rms = max(rms_samples)
    avg_pitch = sum(pitch_samples) / len(pitch_samples) if pitch_samples else 0
    
    # Pitch variability (std dev)
    if pitch_samples and len(pitch_samples) > 1:
        pitch_mean = avg_pitch
        pitch_var = sum((p - pitch_mean) ** 2 for p in pitch_samples) / len(pitch_samples)
        pitch_variability = math.sqrt(pitch_var)
    else:
        pitch_variability = 0
    
    # RMS variability (std dev)
    rms_mean = avg_rms
    rms_var = sum((r - rms_mean) ** 2 for r in rms_samples) / len(rms_samples)
    rms_std = math.sqrt(rms_var)
    
    # Stability score (0-10)
    # Pitch stability
    if pitch_samples and len(pitch_samples) > 1:
        pitch_stability = max(0, 10 - min(10, pitch_variability / 12))
    else:
        pitch_stability = 5
    
    # Volume stability
    volume_stability = max(0, 10 - min(10, rms_std * 40))
    
    # Combined stability (70% pitch, 30% volume)
    stability_score = (pitch_stability * 0.7 + volume_stability * 0.3)
    stability_score = max(0, min(10, round(stability_score * 100) / 100))
    
    return {
        'averageRms': round(avg_rms, 4),
        'peakRms': round(peak_rms, 4),
        'averagePitchHz': round(avg_pitch, 2),
        'pitchVariabilityHz': round(pitch_variability, 2),
        'stabilityScore': stability_score,
        'sampledFrames': len(rms_samples),
        'rmsVariability': round(rms_std, 4),
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: toneAnalyzer.py <file_path>'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        pcm_data = get_audio_from_file(file_path)
        result = analyze_tone(pcm_data)
        
        if result:
            print(json.dumps(result))
        else:
            print(json.dumps({'error': 'No audio detected in file'}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
