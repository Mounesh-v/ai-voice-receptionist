---
license: mit
pipeline_tag: automatic-speech-recognition
language:
- hi
- kn
- ml
- te
- en
- gu
- pa
- or
- bn
- ta
- as
- sa
- ne
- mr
datasets:
- ARTPARK-IISc/Vaani
- ARTPARK-IISc/Vaani-transcription-part
---

## Model Overview

This is a **~430 million parameter FastConformer-based Automatic Speech Recognition (ASR)** model with a **hybrid TDT-CTC decoder**. The model is quantized to **FP16**, resulting in a total model size of approximately **900 MB**.
The model was pretrained from scratch using **31,255 hours** of speech data from the **Vaani** dataset, covering **105 languages**. It then underwent an **audio-image alignment** stage using **11 million audio-image pairs** from the **Vaani** dataset to leverage multimodal relationships for learning richer audio representations..
Finally, the model was fine-tuned on approximately **31,270 hours** of transcribed speech data spanning **65 Indian languages and dialects**, using a combination of the Vaani dataset and multiple open-source speech datasets.

## Supported Languages

The model supports **65 Indian languages and dialects**, covering all major language families spoken across the country. It includes widely spoken scheduled languages such as Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, and Telugu.

In addition, the model supports numerous regional and low-resource languages and dialects, including Angami, Angika, Ao, Awadhi, Bajjika, Bearybashe, Bhili, Bhojpuri, Bundeli, Chakhesang, Chakma, Chhattisgarhi, English, Garhwali, Garo, Gondi, Halbi, Haryanvi, Idu Mishmi, Jaipuri, Karbi, Khariboli, Khortha, Kokborok, Kumaoni, Kurukh, Magadhi, Malvani, Marwari, Mizo, Nagamese, Nagpuri, Nyishi, Rajasthani, Rengma, Rongmei, Sadri, Sambalpuri, Sumi, Surgujia, Surjapuri, Tagin, Thethi, Tulu, and Wancho.
**Note:** Although the pretraining corpus covered 105 languages, this released model is fine-tuned for **65 Indian languages and dialects**. Urdu and Kashmiri are not supported in this release.


## Sample Usage
```

import sys, torch
from transformers import AutoModel
access_token=<hf_token>
REPO = "ARTPARK-IISc/SraVaani-1.0"
DEV = "cuda" if torch.cuda.is_available() else "cpu"
model = AutoModel.from_pretrained(REPO, trust_remote_code=True,token=access_token).to(DEV).eval()

fpath=<file_path>
hyps = model.transcribe(fpath, return_hypotheses=True)
for path, h in zip(sys.argv[1:], hyps):
    print(f"{path}\t{h.text}")

# --- lower-level alternative (explicit processor) ---
# from transformers import AutoProcessor
# import soundfile as sf   # or: import wave (stdlib) for PCM WAV
# proc = AutoProcessor.from_pretrained(REPO, trust_remote_code=True)
# wav, sr = sf.read(path, dtype="float32")   # average channels if stereo
# inputs = proc(wav, sampling_rate=sr, return_tensors="pt").to(DEV)
# text = proc.batch_decode(model.generate(**inputs))[0]


```

## ONNX Export

The ONNX version of this model, along with a sample inference script is available here: [**SraVaani ONNX**](https://drive.google.com/file/d/1ap6qSg-DG5va-noeNY8diMVLqygutqBa/view?usp=sharing)

## Performance
## Scheduled languages

| Language | Avg WER | CommonVoice | Fleurs | GramVaani | IndicTTS | IndicVoices-R | Kathbath | MUCS | RESPIN | Vaani |
|---|---|---|---|---|---|---|---|---|---|---|
| Assamese | 19.4 | 22.6 | 18.8 | – | – | – | – | – | – | 16.9 |
| Bengali | 19.8 | 14.1 | 15.2 | – | 26.2 | – | 12.3 | – | 26.9 | 24.1 |
| Bodo | 20.9 | – | – | – | – | 20.9 | – | – | – | – |
| Dogri | 32.0 | – | – | – | – | 32.0 | – | – | – | – |
| Gujarati | 19.0 | – | 18.2 | – | 18.4 | – | 14.9 | 26.6 | – | 16.8 |
| Hindi | 12.4 | 12.7 | 10.9 | 20.93 | 9.1 | – | 9.1 | 14.6 | 10.8 | 10.8 |
| Kannada | 27.4 | – | 21.4 | – | 17.4 | – | 16.6 | – | 27.4 | 54.1 |
| Konkani | 54.7 | – | – | – | – | – | – | – | – | 54.7 |
| Maithili | 27.5 | – | – | – | – | – | – | – | 20.2 | 34.8 |
| Malayalam | 27.7 | 33.5 | 19.9 | – | 19.4 | – | 31.5 | – | – | 34.1 |
| Manipuri | 41.6 | – | – | – | – | – | – | – | – | 41.6 |
| Marathi | 19.7 | 16.6 | 18.1 | – | 14.2 | – | 17.8 | 22.0 | 16.1 | 33.4 |
| Nepali | 31.3 | 45.8 | 26.6 | – | – | – | – | – | – | 21.5 |
| Odia | 25.7 | 29.4 | 20.3 | – | 18.7 | – | 21.4 | 21.4 | – | 43.2 |
| Punjabi | 20.2 | 29.3 | 15.9 | – | – | – | 13.6 | – | – | 22.1 |
| Sanskrit | 36.4 | – | – | – | – | – | 36.4 | – | – | – |
| Santali | 57.3 | – | – | – | – | – | – | – | – | 57.3 |
| Sindhi | 23.2 | – | – | – | – | 23.2 | – | – | – | – |
| Tamil | 26.2 | 28.9 | 28.1 | – | 21.1 | – | 23.3 | 24.1 | – | 32.0 |
| Telugu | 25.1 | – | 23.1 | – | 20.9 | – | 21.3 | 26.4 | 25.4 | 33.5 |

## Non-scheduled languages

| Language | Avg WER | RESPIN | Vaani  |
|---|---|---|---|
| Angami | 78.3 | – | 78.3 |
| Angika | 31.4 | – | 31.4 |
| Ao | 57.7 | – | 57.7 |
| Awadhi | 43.8 | – | 43.8 |
| Bajjika | 34.4 | – | 34.4 |
| Bearybashe | 77.8 | – | 77.8 |
| Bhili | 73.5 | – | 73.5 |
| Bhojpuri | 27.8 | 20.8 | 34.8 |
| Bundeli | 36.0 | – | 36.0 |
| Chakhesang | 75.8 | – | 75.8 |
| Chakma | 51.2 | – | 51.2 |
| Chhattisgarhi | 27.4 | 14.5 | 40.3 |
| English | 14.8 | – | 14.8 |
| Garhwali | 53.5 | – | 53.5 |
| Garo | 9.5 | – | 9.5 |
| Gondi | 82.8 | – | 82.8 |
| Halbi | 51.6 | – | 51.6 |
| Haryanvi | 48.1 | – | 48.1 |
| Idu Mishmi | 64.1 | – | 64.1 |
| Jaipuri | 28.1 | – | 28.1 |
| Karbi | 63.3 | – | 63.3 |
| Khariboli | 27.0 | – | 27.0 |
| Khorth/Khortha/Khorthkhotta | 41.3 | – | 41.3 |
| Kokborok | 68.2 | – | 68.2 |
| Kumaoni | 30.4 | – | 30.4 |
| Kurukh | 75.8 | – | 75.8 |
| Magadhi/Magahi | 30.4 | 23.0 | 37.8 |
| Malvani | 30.4 | – | 30.4 |
| Marwari | 39.7 | – | 39.7 |
| Mizo | 25.3 | – | 25.3 |
| Nagamese | 50.1 | – | 50.1 |
| Nagpuri | 58.8 | – | 58.8 |
| Nyishi | 91.9 | – | 91.9 |
| Rajasthani | 41.8 | – | 41.8 |
| Rengma | 71.7 | – | 71.7 |
| Rongmei | 92.4 | – | 92.4 |
| Sadri | 58.8 | – | 58.8 |
| Sambalpuri | 62.7 | – | 62.7 |
| Sumi | 78.5 | – | 78.5 |
| Surgujia | 37.5 | – | 37.5 |
| Surjapuri | 69.1 | – | 69.1 |
| Tagin | 61.1 | – | 61.1 |
| Thethi | 41.2 | – | 41.2 |
| Tulu | 57.3 | – | 57.3 |
| Wancho | 67.6 | – | 67.6 |

## Limitations

Although the model supports 65 Indian languages and dialects, the amount of fine-tuning data varies significantly across languages. For several low-resource languages, the available training data is limited, which may result in lower recognition accuracy compared to high-resource languages.


## Fine-tuning
You can fine-tune the SraVaani 1.0 speech recognition model on your own data using the [SraVaani repo](https://github.com/ARTPARK-Speech-Models/SraVaani).

The repo includes scripts to download the base checkpoint and run fine-tuning with NVIDIA NeMo on custom Indian-language audio. It also includes a notebook demonstrating an example fine-tuning run. 

Checkpoint access:
The checkpoint download and request-access links are available in the repo's README. If you don't already have access, you can request it there — access will be granted as soon as possible.


## Feedback

We welcome feedback, suggestions, and bug reports from the community. If you encounter any issues or have questions about the model, please contact us at:

**[vaanicontact@gmail.com](mailto:vaanicontact@gmail.com)** and agneedh@artpark.in 


# Citation
If you use this model, please cite the following:
```
@misc{pulikodan2026sravaani10scalinginclusive,
      title={SraVaani 1.0: Scaling Inclusive Speech Recognition for Indic Languages}, 
      author={Sujith Pulikodan and Agneedh Basu and Pavan Kumar J and Pranav D Bhat and Suryansh Shukla and Nihar Desai and Prasanta Kumar Ghosh},
      year={2026},
      eprint={2608.08235},
      archivePrefix={arXiv},
      primaryClass={eess.AS},
      url={https://arxiv.org/abs/2608.08235}, 
}
```