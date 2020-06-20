import mysql.connector


def get_connection():
    mydb = mysql.connector.connect(
        host="35.205.56.208",
        user="root",
        password="jbGf8ANmy361v05a",
        database="renders"
    )
    return mydb


def insert_row(columns, values, table="entries"):
    ''' Insert values into columns in table '''
    mydb = get_connection()
    sql = "INSERT INTO " + table + " (" + ", ".join(columns) + ") VALUES (%s" + ", %s"*(len(columns)-1) + ")"
    mycursor = mydb.cursor()
    mycursor.execute(sql, values)
    mydb.commit()
    mycursor.close()
    mydb.close()


def get_value(sql_filter, columns="*", table="entries"):
    ''' Get value from columns (default all) in tables matching sqlfilter '''
    mydb = get_connection()
    sql = "SELECT " + columns + " FROM " + table + " WHERE " + sql_filter
    mycursor = mydb.cursor()
    mycursor.execute(sql)
    results = mycursor.fetchall()
    mycursor.close()
    mydb.close()
    return results


def update_value(video_id, colummn, value, table="entries", connection=None):
    ''' Update column of video_id in table to value '''
    if connection is None:
        mydb = get_connection()
    else:
        mydb = connection
    sql = "UPDATE " + table + " SET " + colummn + " = '" + str(value) + "' WHERE " + video_id
    mycursor = mydb.cursor()
    mycursor.execute(sql)
    mydb.commit()
    mycursor.close()
    if connection is None:
        mydb.close()
