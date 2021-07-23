import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetisService } from 'app/shared/metis/metis.service';
import { MockMetisService } from '../../../../../helpers/mocks/service/mock-metis-service.service';
import { DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import * as moment from 'moment';
import { Moment } from 'moment';
import * as sinon from 'sinon';
import { SinonStub, spy, stub } from 'sinon';
import { ArtemisTranslatePipe } from 'app/shared/pipes/artemis-translate.pipe';
import { MockPipe } from 'ng-mocks';
import { User } from 'app/core/user/user.model';
import { ArtemisDatePipe } from 'app/shared/pipes/artemis-date.pipe';
import { AnswerPost } from 'app/entities/metis/answer-post.model';
import { getElement } from '../../../../../helpers/utils/general.utils';
import { AnswerPostHeaderComponent } from 'app/shared/metis/postings-header/answer-post-header/answer-post-header.component';
import { MockNgbModalService } from '../../../../../helpers/mocks/service/mock-ngb-modal.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AnswerPostCreateEditModalComponent } from 'app/shared/metis/postings-create-edit-modal/answer-post-create-edit-modal/answer-post-create-edit-modal.component';

chai.use(sinonChai);
const expect = chai.expect;

let metisService: MetisService;
let metisServiceUserIsAtLeastTutorStub: SinonStub;
let metisServiceUserPostAuthorStub: SinonStub;
let metisServiceDeletePostStub: SinonStub;
let modal: MockNgbModalService;

describe('AnswerPostHeaderComponent', () => {
    let component: AnswerPostHeaderComponent;
    let fixture: ComponentFixture<AnswerPostHeaderComponent>;
    let debugElement: DebugElement;

    const user = { id: 1, name: 'usersame', login: 'login' } as User;

    const today: Moment = moment();
    const yesterday: Moment = moment().subtract(1, 'day');

    const answerPost = {
        id: 1,
        author: user,
        creationDate: yesterday,
        content: 'Answer Post Content',
    } as AnswerPost;

    beforeEach(async () => {
        return TestBed.configureTestingModule({
            imports: [],
            providers: [
                { provide: MetisService, useClass: MockMetisService },
                { provide: NgbModal, useClass: MockNgbModalService },
            ],
            declarations: [AnswerPostHeaderComponent, AnswerPostCreateEditModalComponent, MockPipe(ArtemisTranslatePipe), MockPipe(ArtemisDatePipe)],
            schemas: [NO_ERRORS_SCHEMA],
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(AnswerPostHeaderComponent);
                component = fixture.componentInstance;
                metisService = TestBed.inject(MetisService);
                modal = TestBed.inject(NgbModal);
                metisServiceUserIsAtLeastTutorStub = stub(metisService, 'metisUserIsAtLeastTutorInCourse');
                metisServiceUserPostAuthorStub = stub(metisService, 'metisUserIsAuthorOfPosting');
                metisServiceDeletePostStub = stub(metisService, 'deleteAnswerPost');
                debugElement = fixture.debugElement;
                component.posting = answerPost;
                component.ngOnInit();
            });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should set author information correctly', () => {
        fixture.detectChanges();
        const headerAuthorAndDate = fixture.debugElement.nativeElement.querySelector('.posting-header.header-author-date');
        expect(headerAuthorAndDate).to.exist;
        expect(headerAuthorAndDate.innerHTML).to.contain(user.name);
    });

    it('should set date information correctly for answer post of today', () => {
        component.posting.creationDate = today;
        component.ngOnInit();
        fixture.detectChanges();
        expect(getElement(debugElement, '.posting-header.header-author-date').innerHTML).to.contain('Today');
    });

    it('should set date information correctly for post of yesterday', () => {
        component.posting.creationDate = yesterday;
        component.ngOnInit();
        fixture.detectChanges();
        expect(getElement(debugElement, '.posting-header.header-author-date').innerHTML).to.not.contain('Today');
    });

    it('should display edit and delete options to tutor', () => {
        metisServiceUserIsAtLeastTutorStub.returns(true);
        component.ngOnInit();
        fixture.detectChanges();
        expect(getElement(debugElement, '.editIcon')).to.exist;
        expect(getElement(debugElement, '.deleteIcon')).to.exist;
    });

    it('should display edit and delete options to post author', () => {
        metisServiceUserPostAuthorStub.returns(true);
        component.ngOnInit();
        fixture.detectChanges();
        expect(getElement(debugElement, '.editIcon')).to.exist;
        expect(getElement(debugElement, '.deleteIcon')).to.exist;
    });

    it('should not display edit and delete options to users that are neither author or tutor', () => {
        metisServiceUserIsAtLeastTutorStub.returns(false);
        metisServiceUserPostAuthorStub.returns(false);
        component.ngOnInit();
        fixture.detectChanges();
        expect(getElement(debugElement, '.editIcon')).to.not.exist;
        expect(getElement(debugElement, '.deleteIcon')).to.not.exist;
    });

    it('should open modal when edit icon is clicked', () => {
        metisServiceUserPostAuthorStub.returns(true);
        const modalSpy = spy(modal, 'open');
        fixture.detectChanges();
        getElement(debugElement, '.editIcon').click();
        fixture.detectChanges();
        expect(modalSpy).to.have.been.called;
    });

    it('should invoke metis service when delete icon is clicked', () => {
        metisServiceUserIsAtLeastTutorStub.returns(true);
        fixture.detectChanges();
        expect(getElement(debugElement, '.deleteIcon')).to.exist;
        component.deletePosting();
        expect(metisServiceDeletePostStub).to.have.been.called;
    });
});
