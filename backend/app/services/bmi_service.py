# backend/app/services/bmi_service.py
# pure calculation logic - kept separate from the route so it's testable
from app.models.user import BMIRequest, BMIResponse


BMI_CATEGORIES = [
    (16.0,  "Severely Underweight", "#FF5252", "Consider consulting a nutritionist urgently."),
    (18.5,  "Underweight",          "#80DEEA", "Focus on nutrient-dense foods to gain healthy weight."),
    (25.0,  "Healthy Weight",       "#69F0AE", "Great! Maintain your lifestyle with consistent activity."),
    (30.0,  "Overweight",           "#FFD740", "Balanced diet and regular exercise will help you reach your goal."),
    (35.0,  "Obese Class I",        "#FF8A65", "Start slow and stay consistent — every step counts!"),
    (40.0,  "Obese Class II",       "#FF6B9D", "Please consult a healthcare provider for a safe plan."),
    (float("inf"), "Obese Class III","#EF5350", "Medical supervision is strongly recommended."),
]


def calculate_bmi_full(req: BMIRequest) -> BMIResponse:
    h_m = req.height_cm / 100
    bmi = req.weight_kg / (h_m ** 2)

    # determine category
    category, color, advice = "Unknown", "#fff", ""
    for threshold, cat, col, adv in BMI_CATEGORIES:
        if bmi < threshold:
            category, color, advice = cat, col, adv
            break

    # Mifflin-St Jeor BMR
    if req.gender == "female":
        bmr = 10 * req.weight_kg + 6.25 * req.height_cm - 5 * req.age - 161
    else:
        bmr = 10 * req.weight_kg + 6.25 * req.height_cm - 5 * req.age + 5

    tdee = bmr * req.activity_lvl

    # calorie target based on goal
    cal_delta = {"lose": -400, "maintain": 0, "gain": 350}
    target_cals = tdee + cal_delta.get(req.goal, 0)

    # macro split (% of calories)
    macro_splits = {
        "lose":     {"protein": 35, "carbs": 35, "fats": 30},
        "maintain": {"protein": 30, "carbs": 40, "fats": 30},
        "gain":     {"protein": 35, "carbs": 45, "fats": 20},
    }
    splits = macro_splits.get(req.goal, macro_splits["maintain"])

    # convert to grams (protein/carbs = 4 kcal/g, fat = 9 kcal/g)
    macros = {
        "protein_pct": splits["protein"],
        "carbs_pct":   splits["carbs"],
        "fats_pct":    splits["fats"],
        "protein_g":   round((target_cals * splits["protein"] / 100) / 4),
        "carbs_g":     round((target_cals * splits["carbs"]   / 100) / 4),
        "fats_g":      round((target_cals * splits["fats"]    / 100) / 9),
    }

    return BMIResponse(
        bmi=round(bmi, 1),
        category=category,
        color=color,
        bmr=round(bmr),
        tdee=round(tdee),
        target_calories=round(target_cals),
        macros=macros,
        advice=advice,
    )
