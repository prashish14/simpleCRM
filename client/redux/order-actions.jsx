// action creators are functions that take a param and return
// an 'action' that is consumed by a reducer. This may seem like
// unneeded boilerplate  but it's **really** nice to have a file
// with *all* possible ways to mutate the state of the app.

import { validateItemAndAddValidationResults, validateItemAgainstSchema } from '../../lib/validation-helpers';
import { recalculateOrderTotals } from '../../lib/order-logic';

import Orders from '../../api/orders/order';
import store from './store.jsx';

// Hook the collection
Meteor.startup(function () { // work around files not being defined yet
    console.log("Orders collection, add Redux tracking");
    if (Meteor.isClient) { // work around not having actions in /both folder
        // trigger action when this changes
        trackCollection(Orders, (data) => {
            store.dispatch(ordersCollectionChanged(data));
        });
    }
});


// used when a mongo orders collection changes
function ordersCollectionChanged(newDocs) {
    console.log("OrderActions.ordersCollectionChanged ", newDocs);
    return (dispatch, getState) => {
        console.log("inner OrderActions.ordersCollectionChanged ");
        return {
            type: 'ORDERS_COLLECTION_CHANGED',
            collection: newDocs
        };
    }
}


// doesn't return payload because our collection watcher
// will send a CHANGED action and update the store
export function saveOrder(order) {
    console.log("saveOrder: ", order);
    return (dispatch, getState) => {

        // call the method for upserting the data
        Orders.methods.upsert.call({
            orderId: order._id,
            data: order
        }, (err, res) => {
            //console.log ("Orders.methods.updateManualForm.call was called");
            if (err) {
                // TODO call FAILED action on error
                sAlert.error(err.message);
            } else {
                sAlert.success("Save successful");
                FlowRouter.go("/");
                return {type: 'SAVE_ORDER'};
            }
        });
    }
}


export function editOrder(order, newValues) {
    console.log("OrderActions.editOrder() event.target:" + newValues);
    return (dispatch, getState) => {

        // don't mutate it
        const updatedOrder = _.clone(order);

        // loop each change and apply to our clone
        for (let newValue of newValues) {
            updatedOrder[newValue.name] = newValue.value;
        }

        // validate and set error messages
        validateItemAndAddValidationResults(updatedOrder, Schemas.OrderSchema);

        return {
            type: 'EDIT_ORDER',
            updatedOrder
        };
    }
}


export function editOrderLine(orderLineId, field, value) {
    console.log("OrderActions.editOrder() event.value:" + value);
    return (dispatch, getState) => {
        console.log("inner OrderActions.editOrder()");

        // get the order and line - don't mutate
        const order = _.clone(getState().userInterface.BeingEdited);
        const line = order.orderLines.find(x => x._id === orderLineId);

        line[field] = value;

        // validate and set error messages
        recalculateOrderTotals(order);

        validateItemAndAddValidationResults(line, Schemas.OrderLineSchema);

        return {
            type: 'EDIT_ORDER',
            order
        };
    }
}


export function editOrderLineProduct(orderLineId, newValue) {
    console.log("OrderActions.editOrderLineProduct() newValue:" + newValue);
    return (dispatch, getState) => {
        console.log("inner OrderActions.editOrderLineProduct()");

        // get the order and line - don't mutate
        const order = _.clone(getState().userInterface.customerBeingEdited);
        const line = order.orderLines.find(x => x._id === orderLineId);

        line.productId = newValue.selectedOption._id;
        line.description = newValue.selectedOption.name;
        line.unitPrice = newValue.selectedOption.price;

        // validate and set error messages
        recalculateOrderTotals(order);

        validateItemAndAddValidationResults(line, Schemas.OrderLineSchema);

        return {
            type: 'EDIT_ORDER',
            order
        };
    }
}


export function addNewOrderLine(event) {
    return (dispatch, getState) => {
        console.log("inner addNewOrderLine");
        event.preventDefault();

        // get the order and line - don't mutate
        const order = _.clone(getState().userInterface.customerBeingEdited);

        order.orderLines.push(this.getEmptyOrderLine());

        return {
            type: 'EDIT_ORDER',
            order
        };
    }
}


export function deleteOrderLine(id) {
    return (dispatch, getState) => {
        console.log("inner deleteOrderLine");
        event.preventDefault();

        // get the order and line - don't mutate
        const order = _.clone(getState().userInterface.customerBeingEdited);

        const line = order.orderLines.find(x => x._id === id);
        const pos = order.orderLines.indexOf(line);
        console.log("pos index ", pos);

        order.orderLines.splice(pos, 1);

        // update the calculated totals
        recalculateOrderTotals(order);

        return {
            type: 'EDIT_ORDER',
            order
        };
    }
}
function getEmptyOrderLine() {
    return {
        _id: Meteor.uuid(),
        productId: null,
        description: null,
        quantity: 0,
        unitPrice: 0,
        lineValue: 0,
        createdAt: new Date()//,
    };
}


function loadOrderToEdit(orderId) {
    console.log("loadOrderToEdit");
    const order = Orders.findOne({_id: orderId})
    console.log("loadOrderToEdit ", order);

    // perform initial validation and set error messages
    validateItemAndAddValidationResults(order, Schemas.OrderSchema);

    order.orderLines.forEach(line => {
        validateItemAndAddValidationResults(line, Schemas.OrderLineSchema);
    });

    return {
        type: 'SELECT_ORDER',
        order
    } ;
}

export function selectOrder(orderId) {
    console.log("OrderActions.selectOrder: " + orderId.toString());
    return (dispatch, getState) => {
        console.log("INNER Actions.selectOrder: " + orderId.toString());
        dispatch(loadOrderToEdit(orderId));
    }
}

export function selectNewOrder() {
    console.log("OrderActions.selectNewOrder ")
    return (dispatch, getState) => {

        const newOrder = {
            orderLines: [],
            createdAt: new Date()
        };

        return {
            type: 'SELECT_ORDER',
            newOrder
        };
    }
}
