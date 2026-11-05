from database.db import get_db_connection

try:
    connection = get_db_connection()

    if connection.is_connected():
        print("MySQL connected successfully!")

    print("Database:", connection.database)

except Exception as error:
    print("Database connection failed:", error)

finally:
    if "connection" in locals() and connection.is_connected():
        connection.close()