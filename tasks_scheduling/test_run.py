import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from tasks_scheduling.tasks import validate_cscs_card

test_request = {
        "scheme": "CSCS",
        "first_name": "John",
        "last_name": "Doe",
        "registration_number": "123456789",
        "expiry_date": "2025-12-31",
        "hse_tested": True,
        "role": "Worker"
    }

result = validate_cscs_card.delay("test89865@gmail.com", test_request)
print("Task sent to Redis, waiting for result...")
print(result.get())  


# Send task to Redis manually
# result = email_about_status_of_expiry_dates.delay()

# print("Task sent to Redis, waiting for result...")
# print(result.get())  # Blocks until worker finishes





# @celery_app.task
# def email_about_status_of_expiry_dates():
#     print("Checking expiry dates...")
#     conn = connect_db()
#     cursor = conn.cursor()
    
#     try:
#         cursor.execute("SELECT DISTINCT admin_email FROM accepted_data")
#         admins = cursor.fetchall()
#         print(admins)
#         if not admins:
#             return "No admins found."

#         for admin_row in admins:
#             admin_email = admin_row['admin_email']

#             query = """
#             SELECT 
#                 a.admin_email,
#                 a.user_email,
#                 STRING_AGG(DISTINCT a.position || ' (' || a.work_location || ')', ', ') AS positions,
#                 JSON_AGG(
#                     DISTINCT JSONB_BUILD_OBJECT(
#                         'card_id', c.card_id,
#                         'name', c.name,
#                         'reg_no', c.reg_no,
#                         'card_type', c.card_type,
#                         'date_of_expiration', c.date_of_expiration,
#                         'scheme_name', c.scheme_name,
#                         'qualifications', c.qualifications
#                     )
#                 ) AS cards
#             FROM accepted_data a
#             LEFT JOIN active_card_details c ON a.user_email = c.user_email
#             WHERE a.admin_email = %s
#             GROUP BY a.admin_email, a.user_email
#             ORDER BY a.admin_email, a.user_email;
#             """
#             cursor.execute(query, (admin_email,))
#             rows = cursor.fetchall()

#             if not rows:
#                 continue


#             columns = ['admin_email', 'user_email', 'positions', 'cards']
#             df_users = pd.DataFrame(rows, columns=columns)


#             cards_data = []
#             for _, row in df_users.iterrows():
#                 user_email = row['user_email']
#                 if row['cards']:
#                     try:
#                         cards_list = json.loads(row['cards'])
#                     except TypeError:
#                         cards_list = row['cards']  # Already a list
#                     if isinstance(cards_list, list):
#                         for card in cards_list:
#                             cards_data.append({
#                                 'user_email': user_email,
#                                 'card_id': card.get('card_id'),
#                                 'name': card.get('name'),
#                                 'reg_no': card.get('reg_no'),
#                                 'card_type': card.get('card_type'),
#                                 'date_of_expiration': card.get('date_of_expiration'),
#                                 'scheme_name': card.get('scheme_name'),
#                                 'qualifications': ', '.join(card.get('qualifications', []))
#                             })

#             df_cards = pd.DataFrame(cards_data)

#             excel_buffer = BytesIO()
#             with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
#                 df_users.drop(columns=['cards'], inplace=True)  # Remove raw JSON before writing
#                 df_users.to_excel(writer, index=False, sheet_name="Users")
#                 if not df_cards.empty:
#                     df_cards.to_excel(writer, index=False, sheet_name="Cards")
#             excel_buffer.seek(0)
#             # download the excel file locally for testing
#             with open(f"user_card_details_{admin_email}.xlsx", "wb") as f:
#                 f.write(excel_buffer.read())
#             excel_buffer.seek(0)
#             # send_email_with_attachment(
#             #     to_email=admin_email,
#             #     subject="User & Card Details for Your Team",
#             #     body="Please find attached the user and card details.",
#             #     attachment_data=excel_buffer.read(),
#             #     attachment_name="user_card_details.xlsx"
#             # )

#         return "Emails with Excel sheets sent to all admins."

#     except psycopg2.Error as e:
#         raise Exception(f"Database query error: {e}")
#     finally:
#         cursor.close()
#         conn.close()