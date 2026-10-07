from django.db import migrations

MEDICAL_CONDITIONS = [
    {
        "name": "Type 1 Diabetes",
        "description": "Autoimmune condition requiring strict carbohydrate monitoring and insulin management.",
    },
    {
        "name": "Type 2 Diabetes",
        "description": "Metabolic condition requiring balanced carbohydrate intake and glycemic control.",
    },
    {
        "name": "Hypertension",
        "description": "High blood pressure condition requiring sodium moderation and potassium-rich nutrition.",
    },
    {
        "name": "High Cholesterol",
        "description": "Cardiovascular risk condition requiring saturated fat limitation and fiber-rich meals.",
    },
    {
        "name": "Thyroid Disorder",
        "description": "Endocrine condition affecting metabolic rate and specific micronutrient needs.",
    },
    {
        "name": "PCOS / PCOD",
        "description": "Hormonal condition benefiting from low-glycemic index foods and insulin-sensitizing diets.",
    },
    {
        "name": "Heart Disease",
        "description": "Cardiovascular condition requiring heart-healthy, low-sodium, and nutrient-dense nutrition.",
    },
    {
        "name": "Kidney Disease",
        "description": "Renal condition requiring controlled protein, potassium, sodium, and phosphorus intake.",
    },
    {
        "name": "Gout / High Uric Acid",
        "description": "Inflammatory condition requiring restriction of purine-rich foods and adequate hydration.",
    },
    {
        "name": "Asthma",
        "description": "Chronic respiratory condition supported by antioxidant-rich and anti-inflammatory foods.",
    },
]

ALLERGIES = [
    {
        "name": "Peanuts",
        "description": "Severe allergic reaction triggered by peanuts and peanut-derived oils or pastes.",
    },
    {
        "name": "Tree Nuts",
        "description": "Allergic reaction to walnuts, almonds, cashews, pistachios, or other tree nuts.",
    },
    {
        "name": "Dairy / Lactose Intolerance",
        "description": "Inability to digest lactose or allergic reaction to cow and buffalo milk proteins.",
    },
    {
        "name": "Gluten / Wheat",
        "description": "Immune or digestive reaction to gluten proteins found in wheat, barley, and rye.",
    },
    {
        "name": "Eggs",
        "description": "Allergic sensitivity to egg whites or yolks in cooked, fried, or baked foods.",
    },
    {
        "name": "Soy",
        "description": "Allergic reaction to soybeans, tofu, soy milk, and processed soy derivatives.",
    },
    {
        "name": "Shellfish",
        "description": "Allergic reaction to crustaceans and mollusks including prawns, shrimp, and crabs.",
    },
    {
        "name": "Fish",
        "description": "Allergic reaction to freshwater or marine finfish.",
    },
    {
        "name": "Mustard / Mustard Oil",
        "description": "Sensitivity or allergic reaction to mustard seeds and unrefined mustard oil.",
    },
    {
        "name": "Sesame",
        "description": "Allergic reaction to sesame seeds, sesame pastes, and sesame oil.",
    },
]

DIETARY_RESTRICTIONS = [
    {
        "name": "Vegetarian",
        "description": "Diet excluding all meat, poultry, and seafood, while including dairy products.",
    },
    {
        "name": "Vegan",
        "description": "Diet strictly excluding all animal-derived products including meat, dairy, eggs, and honey.",
    },
    {
        "name": "Jain Vegetarian",
        "description": "Strict lacto-vegetarian diet excluding root vegetables including onions, garlic, and potatoes.",
    },
    {
        "name": "Halal",
        "description": "Diet adhering to Islamic guidelines, strictly excluding pork, non-halal meats, and alcohol.",
    },
    {
        "name": "No Beef",
        "description": "Diet excluding all beef and cow meat products in accordance with Hindu dietary traditions.",
    },
    {
        "name": "No Pork",
        "description": "Diet excluding pork and all pork-derived food ingredients.",
    },
    {
        "name": "Low Sodium",
        "description": "Diet restricting high-salt foods, pickles, and processed snacks for blood pressure management.",
    },
    {
        "name": "Low Sugar / Diabetic Diet",
        "description": "Diet limiting refined sugars, traditional sweets, and high-glycemic carbohydrates.",
    },
    {
        "name": "Gluten-Free",
        "description": "Diet excluding all gluten-containing grains for celiac disease or gluten sensitivity.",
    },
]


def seed_reference_data(apps, schema_editor):
    MedicalCondition = apps.get_model("profiles", "MedicalCondition")
    Allergy = apps.get_model("profiles", "Allergy")
    DietaryRestriction = apps.get_model("profiles", "DietaryRestriction")

    for item in MEDICAL_CONDITIONS:
        MedicalCondition.objects.create(
            name=item["name"], description=item["description"]
        )

    for item in ALLERGIES:
        Allergy.objects.create(
            name=item["name"], description=item["description"]
        )

    for item in DIETARY_RESTRICTIONS:
        DietaryRestriction.objects.create(
            name=item["name"], description=item["description"]
        )


def reverse_seed_reference_data(apps, schema_editor):
    MedicalCondition = apps.get_model("profiles", "MedicalCondition")
    Allergy = apps.get_model("profiles", "Allergy")
    DietaryRestriction = apps.get_model("profiles", "DietaryRestriction")

    med_names = [item["name"] for item in MEDICAL_CONDITIONS]
    MedicalCondition.objects.filter(name__in=med_names).delete()

    allergy_names = [item["name"] for item in ALLERGIES]
    Allergy.objects.filter(name__in=allergy_names).delete()

    diet_names = [item["name"] for item in DIETARY_RESTRICTIONS]
    DietaryRestriction.objects.filter(name__in=diet_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            seed_reference_data, reverse_code=reverse_seed_reference_data
        ),
    ]
