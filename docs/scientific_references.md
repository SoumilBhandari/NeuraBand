# NeuraBand — Scientific References

## Biomarker Justification for Alzheimer's Disease Research

### Heart Rate Variability (HRV) — MAX30102

1. **Autonomic dysfunction in dementia (systematic review)**
   HRV indexes show negative effect sizes across all types of dementia and MCI, indicating autonomic nervous system dysfunction.
   - da Silva VP et al. "Heart Rate Variability Indexes in Dementia: A Systematic Review with a Quantitative Analysis." *Curr Alzheimer Res.* 2018;15(1):80-88. PMID: 28558638

2. **HRV predicts cognitive decline in MCI**
   HRV response to physical challenge predicts cognitive decline in patients with mild cognitive impairment.
   - Choe YM et al. "Heart rate variability response to physical challenge predicts cognitive decline in MCI." *Front Aging Neurosci.* 2022;14:886023. doi: 10.3389/fnagi.2022.886023

3. **Combined BP variability and HRV predict ADRD risk**
   Patients in the highest quartile of blood pressure variability and lowest quartile of HRV had significantly increased ADRD risk (HR 2.34).
   - Rouch L et al. *Sci Rep.* 2024;14:3284. doi: 10.1038/s41598-024-52406-8

4. **Critical perspective on HRV as AD biomarker**
   Limited evidence for HRV as a predictor of cognitive and brain markers — "promising biomarker" label may be overly optimistic.
   - Eyre B et al. *J Alzheimers Dis.* 2026. doi: 10.1177/13872877251409343

### Blood Oxygen Saturation (SpO2) — MAX30102

5. **Peripheral oxygen saturation and cognitive impairment**
   Reduced peripheral SpO2 associated with cognitive impairments, particularly AD and vascular dementia.
   - PMC 2025. doi: 10.1038/s41598-025-87429-4

6. **Sleep-disordered breathing and cognitive decline**
   Brain-systemic oxygenation coupling during SDB events as a biomarker for MCI and cognitive decline.
   - Bhatt S et al. *Sci Rep.* 2024;14:28042. doi: 10.1038/s41598-024-84305-3

### Electrodermal Activity (EDA) — Grove GSR

7. **Neural basis of electrodermal activity**
   EDA controlled by ventromedial frontal cortex, anterior cingulate, and insula — regions overlapping with early AD pathology.
   - Tranel D, Damasio H. "Neuroanatomical correlates of electrodermal skin conductance responses." *Psychophysiology.* 1994;31(5):427-438.

8. **Electrodermal deficits in brain lesion patients**
   Patients with discrete lesions in ventromedial frontal and anterior cingulate regions show defective EDA responses.
   - Tranel D. "Electrodermal activity in cognitive neuroscience." In: *The Oxford Handbook of Event-Related Potential Components.* 2011.

9. **GSR in dementia assessment**
   Electrodermal activity used to measure emotional blunting and agitation in dementia patients.
   - van den Berg ME et al. *Dement Geriatr Cogn Disord Extra.* 2018;8(3):354-363. doi: 10.1159/000484890

### Gait Analysis — BMI270 IMU (Strongest Evidence)

10. **Wearable accelerometers differentiate dementia subtypes**
    Gait parameters (pace, variability, rhythm, asymmetry, postural control) from wearable accelerometers differentiated AD, Lewy body dementia, and Parkinson's disease.
    - Mc Ardle R et al. *Gait Posture.* 2020;76:265-270. doi: 10.1016/j.gaitpost.2019.12.023

11. **ML ensemble achieves 85.5% MCI detection from IMU gait data**
    Machine learning ensemble methods using wearable IMU gait data achieved 85.5% accuracy detecting MCI.
    - Soltani A et al. *Front Neurol.* 2024;15:1354092. doi: 10.3389/fneur.2024.1354092

12. **Multi-centre study: gait changes in mild AD**
    People with mild AD walk more slowly, more asymmetrically, with impaired variability and postural control compared to healthy controls.
    - Mc Ardle R et al. *Alzheimers Res Ther.* 2020;12(1):123. PMCID: PMC7617011

13. **Wearable sensor system for early AD detection**
    Early AD detection system using wearable sensors and multilevel gait assessment with machine learning ensemble approach.
    - IEEE Xplore, 2023. doi: 10.1109/ACCESS.2023.3256643

---

## How to Present to Judges

### Narrative Framework
1. Alzheimer's affects brain regions that control autonomic functions (heart rate regulation, skin conductance, motor coordination) **before** cognitive symptoms appear.
2. By monitoring these autonomic biomarkers continuously, we can potentially detect prodromal changes years earlier than current clinical assessments.
3. This wearable is a proof-of-concept that demonstrates real-time passive monitoring of four biomarkers with demonstrated links to neurodegeneration.

### Key Points to Emphasize
- **Gait analysis has the strongest evidence base** — cite references 10-13 when judges ask about scientific validity.
- **Multimodal approach** — no single biomarker is diagnostic; the value is in combining multiple streams.
- **Continuous passive monitoring** — unlike clinical assessments done once per year, this captures data 24/7.
- **Future pipeline integration** — this data could feed the same ML model that processes MRI and PET data.

### Limitations to Acknowledge (proactively)
- This is a research prototype, not a medical device.
- Consumer-grade sensors have lower accuracy than clinical instruments.
- Wrist-based PPG is less reliable than clinical ECG for HRV.
- GSR research in preclinical AD is still exploratory.
- Individual biomarker changes are not specific to Alzheimer's — the multimodal approach adds specificity.
- Longitudinal baseline comparison (tracking changes over months/years) is needed for clinical value.
