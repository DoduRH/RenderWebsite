from google.cloud import firestore
from pytz import UTC
import datetime


def set_document(document, data, merge=False):
    ''' Insert values into columns in table '''
    mydb = firestore.Client()
    data['edit-time'] = datetime.datetime.now()
    mydb.collection('renders').document(document).set(data, merge)


def get_progress(document, last24hours=True):
    ''' Get value from columns (default all) in tables matching sqlfilter '''
    mydb = firestore.Client()
    doc = mydb.collection('renders').document(document).get()
    doc_dict = doc.to_dict()

    if doc.exists and UTC.localize(datetime.datetime.now() + datetime.timedelta(hours=24)) > doc_dict['edit-time']:
        return doc_dict['progress']
    else:
        return None
