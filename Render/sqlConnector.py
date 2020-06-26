from google.cloud import firestore
from pytz import UTC
import datetime


def set_document(document, data, merge=False):
    ''' Insert values into columns in table '''
    mydb = firestore.Client()
    data['edit-time'] = datetime.datetime.now()
    mydb.collection('renders').document(document).set(data, merge)


def get_progress(document, last24hours=True):
    ''' Get progress for document '''
    mydb = firestore.Client()
    doc = mydb.collection('renders').document(document).get()
    doc_dict = doc.to_dict()

    if doc.exists and UTC.localize(datetime.datetime.now() + datetime.timedelta(hours=24)) > doc_dict['edit-time']:
        return doc_dict['progress']
    else:
        return None

def increment_stats(video_size_in, audio_size_in, video_size_out, video_length, word_count):
    ''' Increment statistics '''
    mydb = firestore.Client()
    stats = mydb.collection(u'statistics').document(u'stats')

    stats.update({
        "video_size_in": firestore.Increment(video_size_in),
        "audio_size_in": firestore.Increment(audio_size_in),
        "video_size_out": firestore.Increment(video_size_out),
        "video_length": firestore.Increment(video_length),
        "words_added": firestore.Increment(word_count),
        "total_renders": firestore.Increment(1)
    })
