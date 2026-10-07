from django.test import TestCase
from django.contrib.auth import get_user_model  # gives the user here.


class UserManagerTest(TestCase):

    def test_create_user(self):
        """To test if the program created test_user correctly or not."""

        User = get_user_model()
        user = User.objects.create_user(email="himal@gmail.com", password="himal123")

        # checking

        self.assertEqual(user.email, "himal@gmail.com")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)  # normal user should not be superuser.

        try:
            self.assertIsNone(
                user.username
            )  # if username is none , test passed else fail

        except AttributeError:
            print("Error occured while testing.")

        with self.assertRaises(TypeError):
            User.objects.create_user()
        with self.assertRaises(TypeError):
            User.objects.create_user(email="")
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="himal123")

    def test_create_superuser(self):
        User = get_user_model()
        admin_user = User.objects.create_superuser(
            email="manav@gmail.com", password="manav123"
        )

        # checking errors.

        self.assertEqual(admin_user.email, "manav@gmail.com")
        self.assertTrue(admin_user.is_active)
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)

        try:
            self.assertIsNone(admin_user.username)

        except AttributeError:
            pass

        with self.assertRaises(
            ValueError
        ):  # it is expecting value error. yesle superuser create garne function run garxa. if no error then passed else failed
            User.objects.create_superuser(
                email="manav@gmail.com", password="manav123", is_superuser=False
            )
