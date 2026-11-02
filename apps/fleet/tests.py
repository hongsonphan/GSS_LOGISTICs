from django.test import TestCase

from apps.fleet.models import Vehicle, VehicleType



class LoadCompatTests(TestCase):
    def test_vehicle_vs_load(self):
        from apps.fleet.load_compat import infer_vehicle_type, load_mismatch, parse_load
        tractor = Vehicle(license_plate='51C-1', vehicle_type=VehicleType.TRACTOR)
        truck = Vehicle(license_plate='60H-2', vehicle_type=VehicleType.TRUCK_10T)
        self.assertEqual(parse_load('40HC'), ('CONTAINER', None))
        self.assertEqual(parse_load('2x20DC'), ('CONTAINER', None))
        self.assertEqual(parse_load('2T5'), ('TRUCK', 2500))
        self.assertEqual(parse_load('Xe tải 8T'), ('TRUCK', 8000))
        self.assertEqual(load_mismatch(tractor, '40HC'), '')
        self.assertTrue(load_mismatch(tractor, '8T'))
        self.assertTrue(load_mismatch(truck, '40HC'))
        self.assertEqual(load_mismatch(truck, '8T'), '')
        self.assertTrue(load_mismatch(truck, '15T'))
        self.assertEqual(load_mismatch(None, '40HC'), '')
        self.assertEqual(infer_vehicle_type('8T'), VehicleType.TRUCK_10T)
        self.assertEqual(infer_vehicle_type('40HC'), VehicleType.TRACTOR)
