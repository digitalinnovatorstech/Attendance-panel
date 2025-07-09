from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from attendance.models import Employee

EMPLOYEE_DATA = [
    {"name": "Aedavelli Sai Shankar", "email": "a.saishankar@innovatorstech.com"},
    {"name": "Shaik Khaja Shareef", "email": "shaik.khajashareff@innovatorstech.com"},
    {"name": "Vootukuru Reddiprasad", "email": "reddi.prasad@innovatorstech.com"},
    {"name": "Kavitha", "email": "kavitha@innovatorstech.com"},
    {"name": "Polireddy Kukkala", "email": "polireddy@innovatorstech.com"},
    {"name": "Pathloth Pradeep", "email": "pradeep@innovatorstech.com"},
    {"name": "Nenavath Devender", "email": "devendar@innovatorstech.com"},
    {"name": "Bandi Sarvani", "email": "sarvani@innovatorstech.com"},
    {"name": "Shaik Hazeera", "email": "hazeerashaik@innovatorstech.com"},
    {"name": "Shaik Nagur Babu", "email": "nagurbabu@innovatorstech.com"},
    {"name": "Miriyala Venkata Rayudu", "email": "venkatarayudu@innovatorstech.com"},
    {"name": "Kakkulla Dinesh Sagar", "email": "dineshsagar@innovatorstech.com"},
    {"name": "Venkataramanaiah Pujari - T", "email": "venkataramanaiah@innovatorstech.com"},
    {"name": "Ramya Yandrapalli", "email": "ramya@innovatorstech.com"},
    {"name": "Lakshmi Narayana Katari", "email": "lakshminarayana@innovatorstech.com"},
    {"name": "Shaik Anwar", "email": "shaik.anwar@innovatorstech.com"},
    {"name": "Pothireddy Harshavardhan Reddy", "email": "harshavardhan@innovatorstech.com"},
    {"name": "Adiseshu Reddy Donthina", "email": "adiseshu.donthina@innovatorstech.com"},
    {"name": "Mohan Reddy - T", "email": "mohanreddy@innovatorstech.com"},
    {"name": "Giri Krishna - BD", "email": "giri.krishna@innovatorstech.com"},
    {"name": "Konakala Jaya Krishna", "email": "jayakrishna@innovatorstech.com"},
    {"name": "Syed Azharuddin", "email": "azharuddin@innovatorstech.com"},
    {"name": "Kasani Naga Sai Ram", "email": "nagasairam@innovatorstech.com"},
    {"name": "Katuru Jagadeesh", "email": "jagadeesh@innovatorstech.com"},
    {"name": "Indurthi Sumanth - BD", "email": "sumanth@innovatorstech.com"},
    {"name": "Munagala Venkatasubbaiah", "email": "venkatasubbaiah@innovatorstech.com"},
    {"name": "Santhosh Phani Krishna - T", "email": "santhosh.phani@innovatorstech.com"},
    {"name": "Myla ManiPrakash", "email": "mani.prakash@innovatorstech.com"},
    {"name": "Swati Kumari", "email": "swati.kumari@innovatorstech.com"},
    {"name": "Bayireddy Vamsi Krishna", "email": "vamsi.krishna@innovatorstech.com"},
    {"name": "Konduru Harsha Vardhan", "email": "harsha.vardhan@innovatorstech.com"},
    {"name": "Jalampelli Geethkumar", "email": "geeth.kumar@innovatorstech.com"},
    {"name": "Shaik Saleem", "email": "shaik.saleem@innovatorstech.com"},
    {"name": "Prem Kumar", "email": "prem.kumar@innovatorstech.com"},
    {"name": "Marka Soumya", "email": "soumya@innovatorstech.com"},
    {"name": "Tirakala Venkata Sai Ganesh", "email": "sai.ganesh@innovatorstech.com"},
    {"name": "Yashvendra Kumar", "email": "yashvendra.kumar@innovatorstech.com"},
    {"name": "Murapaka Siddhu", "email": "siddhu@innovatorstech.com"},
    {"name": "Sanket Shivdas Patil", "email": "sanket@innovatorstech.com"},
    {"name": "Nisha Balu Pathare", "email": "nisha@innovatorstech.com"},
    {"name": "Adesh Gaikwad", "email": "adesh@innovatorstech.com"},
    {"name": "Svapnali Dattatrya Shahapure", "email": "svapnali@innovatorstech.com"},
    {"name": "Veerendra Yeleti", "email": "veerendra@innovatorstech.com"},
    {"name": "Shaikh Adnan Shakeel", "email": "adnan.shaikh@innovatorstech.com"},
    {"name": "Kola Sainaveen Goud", "email": "Sai.naveen@innovatorstech.com"},
    {"name": "Siddamsetti NagendraBabu", "email": "nagendra@innovatorstech.com"},
    {"name": "SHARIM SHAIKH", "email": "sharim.shaikh@innovatorstech.com"},
    {"name": "Chandrakanta Das", "email": "chandrakanta.das@innovatorstech.com"},
    {"name": "B.vamshi krishna", "email": "vamshikrishna.b@innovatorstech.com"},
    {"name": "NUNNA SAI MANOHAR", "email": "saimanohar@innovatorstech.com"},
    {"name": "SHAIK GOUSEBASHA", "email": "shaik.gousebasha@innovatorstech.com"},
    {"name": "SYED DOULAT", "email": "syed.doulath@innovatorstech.com"},
    {"name": "Aruna Boya", "email": "aruna@innovatorstech.com"},
    {"name": "Gandavarapu Venkata Ganesh", "email": "venkata.ganesh@innovatorstech.com"},
    {"name": "Byrapuneni Bhargavi", "email": "bhargavi@innovatorstech.com"},
    {"name": "shaik sandhani", "email": "shaik.sandhani@innovatorstech.com"},
    {"name": "KADAVAKUDURU VIJAYASAI", "email": "vijaya.sai@innovatorstech.com"},
    {"name": "KALYANI VODDEPALLI", "email": "kalyani@innovatorstech.com"},
    {"name": "GUDURU SAIKIRAN REDDY", "email": "saikiran.reddy@innovatorstech.com"},
    {"name": "ARIGELA SRI RAMA DURGA PAVAN KUMAR", "email": "pavankumararigela@innovatorstech.com"},
    {"name": "Mansi Gautam Kamble", "email": "mansigautam@innovatorstech.com"},
    {"name": "Muthyala Greeshmanth kumar", "email": "greeshmanthkumar@innovatorstech.com"},
    {"name": "SEELAM CHIRU PRAKASH REDDY", "email": "chiruprakashreddy@innovatorstech.com"},
    {"name": "Shubham Kamandar", "email": "shubam@innovatorstech.com"},
    {"name": "Sushant Jagannath Kamble", "email": "sushant@innovatorstech.com"},
    {"name": "Dasari Naga Revanth Reddy", "email": "revanth.reddy@innovatorstech.com"},
    {"name": "TANDRA KIRANKUMAR", "email": "Kiran.kumar@innovatorstech.com"},
    {"name": "SIMHADRI TRINAGA RAGHAV", "email": "raghav@innovatorstech.com"},
    {"name": "GATADI SANTHOSHI", "email": "gatadisanthoshi@innovatorstech.com"},
    {"name": "DHANEKULA MOHANA GOPI KRISHNA", "email": "Mohanagopikrishna@innovatorstech.com"},
    {"name": "Pallipati Hari Sai Chandu", "email": "harisaichandu@innovatorstech.com"},
    {"name": "Bhupathi Sudharsana Reddy", "email": "sudharsanareddybhupathi@innovatorstech.com"},
    {"name": "Mopada saibaba", "email": "saibabamopada@innovatorstech.com"},
    {"name": "Shaik Sajid", "email": "shaiksajid@innovatorstech.com"},
    {"name": "Thandra Dushyanth kumar", "email": "dushyanthkumarthandra@innovatorstech.com"},
    {"name": "ONGOLE SHRAVAN KUMAR REDDY", "email": "shravankumarreddy@innovatorstech.com"},
    {"name": "Yogeshwar Parasram Nirmale", "email": "yogeshwarparasramnirmale@innvoatorstech.com"},
    {"name": "hanish kolla", "email": "hanishchandra@innovatorstech.com"},
    {"name": "Raghavendra Goud", "email": "raghavendar.goud@innovatorstech.com"},
    {"name": "Neerudu Sandeep", "email": "sandeep@innovatorstech.com"},
    {"name": "Goulla Raja raghavendar Reddy", "email": "raja.reddy@innovatorstech.com"},
    {"name": "Tirupati Reddy - FD", "email": "tirupati.reddy@innovatorstech.com"},
    {"name": "Malavath Vinod Kumar - BD", "email": "vinod.kumar@innovatorstech.com"},
    {"name": "M. Srinivas Goud", "email": "srinivas@innovatorstech.com"},
    {"name": "Gujjula Sravani", "email": "sravanigujjula@innovatorstech.com"},
    {"name": "Mahender Reddy", "email": "mahender.reddy@innovatorstech.com"},
    {"name": "Yuvraj Vishnu Khilare", "email": "yuvrajvishnu@innovatorstech.com"},
    {"name": "Lakavath Ganesh", "email": "lakavathganesh@innovatorstech.com"},
    {"name": "Sricharan Kuraku", "email": "sricharan.kuraku@innovatorstech.com"},
    {"name": "Ponnala Mounika", "email": "ponnala.mounika@innovatorstech.com"},
    {"name": "Syed Mastanvali", "email": "syed.mastanvali@innovatorstech.com"},
    {"name": "Ratna Kumar", "email": "ratna.kumar@innovatorstech.com"},
    {"name": "Purugula Ajay Kumar", "email": "p.ajaykumar@innovatorstech.com"},
    {"name": "Suresh Goud", "email": "suresh.goud@innovatorstech.com"},
    {"name": "Kanna Venkatarao", "email": "kanna.venkatarao@innovatorstech.com"},
    {"name": "Garikapati Venkateswara Rao", "email": "venkateswararao.garikapati@innovatorstech.com"}
]

class Command(BaseCommand):
    help = 'Import employees from the provided list'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        
        for emp_data in EMPLOYEE_DATA:
            name = emp_data['name']
            email = emp_data['email'].lower()
            
            # Split name into first and last name
            name_parts = name.split()
            first_name = name_parts[0] if name_parts else ''
            last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            # Create or update user
            user, user_created = User.objects.get_or_create(
                username=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': email,
                    'is_active': True,
                    'is_staff': False,
                    'is_superuser': False
                }
            )
            
            if not user_created:
                # Update existing user details
                user.first_name = first_name
                user.last_name = last_name
                user.email = email
                user.save()
            
            # Create or update employee
            employee, emp_created = Employee.objects.get_or_create(
                user=user,
                defaults={'email': email}
            )
            
            if not emp_created:
                employee.email = email
                employee.save()
                updated_count += 1
            else:
                created_count += 1
                
            if emp_created or user_created:
                self.stdout.write(self.style.SUCCESS(f'Processed: {name} <{email}>'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully imported {created_count} employees, updated {updated_count} employees'))
