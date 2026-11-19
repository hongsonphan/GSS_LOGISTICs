from django.db import migrations
from decimal import Decimal

ISO_CONTAINER_TYPES = [
    {
        'code': '20GP',
        'name': 'Container 20ft Thường (General Purpose)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('1.00'),
        'max_payload_kg': 28000,
        'cbm_capacity': Decimal('33.20'),
        'is_active': True,
    },
    {
        'code': '40GP',
        'name': 'Container 40ft Thường (General Purpose)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('2.00'),
        'max_payload_kg': 28500,
        'cbm_capacity': Decimal('67.70'),
        'is_active': True,
    },
    {
        'code': '40HC',
        'name': 'Container 40ft Cao (High Cube)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('2.00'),
        'max_payload_kg': 28600,
        'cbm_capacity': Decimal('76.30'),
        'is_active': True,
    },
    {
        'code': '45HQ',
        'name': 'Container 45ft Cao (High Cube)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('2.25'),
        'max_payload_kg': 29500,
        'cbm_capacity': Decimal('86.00'),
        'is_active': True,
    },
    {
        'code': '20RF',
        'name': 'Container 20ft Lạnh (Reefer)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('1.00'),
        'max_payload_kg': 27000,
        'cbm_capacity': Decimal('28.30'),
        'is_active': True,
    },
    {
        'code': '40RF',
        'name': 'Container 40ft Lạnh (Reefer)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('2.00'),
        'max_payload_kg': 29000,
        'cbm_capacity': Decimal('59.30'),
        'is_active': True,
    },
    {
        'code': '20FR',
        'name': 'Container 20ft Flat Rack',
        'category': 'CONTAINER',
        'teu_factor': Decimal('1.00'),
        'max_payload_kg': 31000,
        'cbm_capacity': Decimal('31.00'),
        'is_active': True,
    },
    {
        'code': '40FR',
        'name': 'Container 40ft Flat Rack',
        'category': 'CONTAINER',
        'teu_factor': Decimal('2.00'),
        'max_payload_kg': 40000,
        'cbm_capacity': Decimal('62.00'),
        'is_active': True,
    },
    {
        'code': '20OT',
        'name': 'Container 20ft Mở nóc (Open Top)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('1.00'),
        'max_payload_kg': 28000,
        'cbm_capacity': Decimal('32.00'),
        'is_active': True,
    },
    {
        'code': '40OT',
        'name': 'Container 40ft Mở nóc (Open Top)',
        'category': 'CONTAINER',
        'teu_factor': Decimal('2.00'),
        'max_payload_kg': 31500,
        'cbm_capacity': Decimal('65.50'),
        'is_active': True,
    },
]

def seed_container_types(apps, schema_editor):
    ContainerType = apps.get_model('master_data', 'ContainerType')
    for item in ISO_CONTAINER_TYPES:
        ContainerType.objects.update_or_create(
            code=item['code'],
            defaults={
                'name': item['name'],
                'category': item['category'],
                'teu_factor': item['teu_factor'],
                'max_payload_kg': item['max_payload_kg'],
                'cbm_capacity': item['cbm_capacity'],
                'is_active': item['is_active'],
            }
        )

def unseed_container_types(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('master_data', '0006_subcontractorportalaccount_confirm_token_cipher_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_container_types, unseed_container_types),
    ]
