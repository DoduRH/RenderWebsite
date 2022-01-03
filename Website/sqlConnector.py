from google.cloud import firestore
from pytz import UTC
import datetime
import copy
import pathlib

service_account_json_path = pathlib.Path('google-authorisation.json')

def set_document(document, data, merge=False):
    ''' Insert values into columns in table '''
    if not service_account_json_path.exists():
        print("No service account json present")
        return

    # Make sure no elements of data are multi-dimensional arrays
    submit_data = copy.deepcopy(data)
    submit_data['form']['words_array'] = str(submit_data['form']['words_array'])

    mydb = firestore.Client.from_service_account_json(service_account_json_path)
    submit_data['edit-time'] = datetime.datetime.now()
    mydb.collection('renders').document(document).set(submit_data, merge)


def get_document(document, last24hours=True):
    ''' Get progress for document '''
    if not service_account_json_path.exists():
        print("No service account json present")
        return None
    
    mydb = firestore.Client.from_service_account_json(service_account_json_path)
    doc = mydb.collection('renders').document(document).get()
    doc_dict = doc.to_dict()

    if doc.exists and UTC.localize(datetime.datetime.now() + datetime.timedelta(hours=24)) > doc_dict['edit-time']:
        return doc_dict
    else:
        return None

def increment_stats(video_size_in, audio_size_in, video_size_out, video_length, word_count):
    ''' Increment statistics '''
    if not service_account_json_path.exists():
        print("No service account json present")
        return
    
    mydb = firestore.Client.from_service_account_json(service_account_json_path)
    stats = mydb.collection(u'statistics').document(u'stats')

    stats.update({
        "video_size_in": firestore.Increment(video_size_in),
        "audio_size_in": firestore.Increment(audio_size_in),
        "video_size_out": firestore.Increment(video_size_out),
        "video_length": firestore.Increment(video_length),
        "words_added": firestore.Increment(word_count),
        "total_renders": firestore.Increment(1)
    })

if __name__ == '__main__':
    print(get_document("00029806-6a25-4c21-a50f-d6651b48008e"))