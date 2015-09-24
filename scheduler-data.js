var gCollectionObserver = null,
    gEventsCollection = null;

function meteorStart(collection) {
    Session.set('scheduleReady', false);
    var self = this,
        events = [],
        render = null;

    gEventsCollection = new DataCollection();

    if(arguments.length == 2) {
        collectionCursor = arguments[0];
        collection = arguments[1];
    }
    else
        collectionCursor = collection.find();

    var CollectionPerformerObj = new CollectionPerformer(collection);

    gEventsCollection.add(this.attachEvent("onEventLoading", function(event) {
        CollectionPerformerObj.save(event);
        return true;
    }));

    gEventsCollection.add(this.attachEvent("onEventChanged", function(eventId, event) {
        console.log('changed');
        CollectionPerformerObj.save(event);
    }));

    gEventsCollection.add(this.attachEvent("onEventDeleted", function(eventId) {
        CollectionPerformerObj.remove(eventId);
    }));



    gEventsCollection.add(this.attachEvent("onEventAdded", function(eventId, event) {
        console.log('added');
        var id = CollectionPerformerObj.save(event);
        if (self.getEvent(id)){
            console.log('yo')
        }
            //self.deleteEvent(id);
    }));

    collectionCursor.fetch().forEach(function (data){
        var eventData = parseEventData(data);
        if(!self.getEvent(eventData._id))
            events.push(eventData);
        console.log(events);
        //Timeout need for recurring events.
    });
    setTimeout(function() {
        self.parse(events, "json");
        events = [];
    }, 5);



    gCollectionObserver = collectionCursor.observe({

        //added: function(data) {
        //    var eventData = parseEventData(data);
        //    if(!self.getEvent(eventData._id))
        //        events.push(eventData);
        //    console.log('addedObservation');
        //    console.log(events);
        //    //Timeout need for recurring events.
        //    clearTimeout(render);
        //    render = setTimeout(function() {
        //        self.parse(events, "json");
        //        events = [];
        //    }, 5);
        //
        //
        //},

        changed: function(data) {
            var eventData = parseEventData(data),
                event = self.getEvent(eventData._id);

            if(!event)
                return false;

            for(var key in eventData)
                event[key] = eventData[key];

            self.updateEvent(eventData._id);
            return true;
        },

        removed: function(data) {
            if(self.getEvent(data._id))
                self.deleteEvent(data._id);
        }

    });

}

function meteorStop() {
    if(gCollectionObserver){
        console.log('here');
        gCollectionObserver.stop();
    }

    var self = this;
    if(gEventsCollection) {
        gEventsCollection.each(function(eventId) {
            self.detachEvent(eventId);
        });
        gEventsCollection.clean();
    }
}

function CollectionPerformer(collection) {

    this.save = function(event) {
        event = parseEventData(event);
        event.projectId = Session.get('projectId');

        var savedEventData = this.findEvent(event._id);
        if(savedEventData) {
            return collection.update({_id: savedEventData._id}, {$set:
            {
                text: event.text,
                start_date: event.start_date,
                end_date: event.end_date
            }
            });
        }
        else {
            return collection.insert(event);
        }
    };

    this.remove = function(eventId) {
        var savedEventData = this.findEvent(eventId);
        if(savedEventData)
            collection.remove(savedEventData._id);
    };

    this.findEvent = function(eventId) {
        return collection.findOne({_id: eventId});
    };
}

function parseEventData(event) {
    var eventData = {};

    for(var eventProperty in event) {
        if(eventProperty.charAt(0) == "_")
            continue;

        if (eventProperty == "id") {
            event["id"] = event["_id"];
        } else {
            eventData[eventProperty] = event[eventProperty];
        }
    }

    return event;
}

function DataCollection() {
    var collectionData = {},
        currentUid = new Date().valueOf();

    function _uid() {
        return currentUid++;
    }

    this.add = function(data) {
        var dataId = _uid();
        collectionData[dataId] = data;
        return dataId;
    };

    this.each = function(handler) {
        for(var key in collectionData)
            handler.call(this, collectionData[key]);
    };

    this.clean = function() {
        collectionData = {};
    };
}



function initSchedulerMeteor(scheduler) {
    scheduler.meteor = meteorStart;
    scheduler.meteorStop = meteorStop;
}

if(window.Scheduler) {
    Scheduler.plugin(function(scheduler) {
        initSchedulerMeteor(scheduler);
    });
}
else
    initSchedulerMeteor(scheduler);
