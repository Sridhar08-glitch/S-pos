from django.contrib.auth import get_user_model
from django.test import TestCase

class AdminSessionSmokeTest(TestCase):
    def setUp(self):
        self.password = "V17-Test-Password-Change-Me!"
        self.user = get_user_model().objects.create_superuser(
            username="v17_admin_test", email="v17-admin@example.invalid", password=self.password
        )

    def test_admin_login_creates_session(self):
        self.assertTrue(self.client.login(username="v17_admin_test", password=self.password))
        response = self.client.get("/admin/")
        self.assertIn(response.status_code, (200, 301, 302))

    def test_admin_flags(self):
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.is_staff)
        self.assertTrue(self.user.is_superuser)
