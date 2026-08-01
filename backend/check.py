from app.services.calendar import _get_service
import datetime

try:
    service = _get_service()
    now = datetime.datetime.utcnow().isoformat() + 'Z'
    events_result = service.events().list(
        calendarId='primary', maxResults=5, singleEvents=True, 
        orderBy='startTime', timeMin=now
    ).execute()
    events = events_result.get('items', [])
    if not events:
        print('No upcoming events found.')
    for e in events:
        print(f"Event: {e.get('summary')} at {e.get('start').get('dateTime')} -> Link: {e.get('htmlLink')}")
except Exception as e:
    print(f'Error: {e}')
